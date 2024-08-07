# -*- coding: utf-8 -*-
from __future__ import print_function

import json
import pathlib
import apps.vidjil.defs as defs
import re
import time
import sys
import datetime
import random
import xmlrpc.client
import apps.vidjil.modules.tools_utils as tools_utils
from .modules.sequenceFile import get_original_filename
from .common import scheduler, db, log

# Task status
STATUS_PENDING = "PENDING"
STATUS_QUEUED = "QUEUED"
STATUS_WAITING = "WAITING"
STATUS_RUNNING = "RUNNING"
STATUS_COMPLETED = "COMPLETED"
STATUS_FAILED = "FAILED"
# TODO: implement TIMEOUT...
STATUS_TIMEOUT = "TIMEOUT"

# Task names
TASK_NAME_PROCESS = "process"
TASK_NAME_PRE_PROCESS = "pre_process"


def assert_scheduler_task_does_not_exist(args):
    ## check already scheduled run
    row = db( ( db.scheduler_task.args == args)
         & ( db.scheduler_task.status != STATUS_FAILED )
         & ( db.scheduler_task.status != STATUS_COMPLETED )
         & ( db.scheduler_task.status != STATUS_TIMEOUT )
         ).select()

    if len(row) > 0 :
        res = {"message": "task already registered"}
        return res

    return None

def register_task(task_name, args):
    db._adapter.reconnect()
    timestamp = time.time()
    task_id = db.scheduler_task.insert( task_name = task_name,
                                        args = args,
                                        status = STATUS_PENDING,
                                        start_time = datetime.datetime.fromtimestamp(timestamp).strftime('%Y-%m-%d %H:%M:%S') )
    return task_id

def update_task(task_id, status):
    db._adapter.reconnect()
    db.scheduler_task[task_id].update_record(status = status)
    db.commit()
    return

def compute_extra(id_file, id_config, min_threshold):
    result = {}
    d = None
    
    results_file = db((db.results_file.sequence_file_id == id_file) &
                      (db.results_file.hidden == False) &
                      (db.results_file.config_id == id_config)
                    ).select(orderby=~db.results_file.run_date).first()
    
    filename = pathlib.Path(defs.DIR_RESULTS, results_file.data_file)
    with open(filename, "rb") as file:
        try:
            d = json.load(file)
            loci_min = {}

            if 'reads' in d and 'germline' in d['reads']:
                loci_totals = d['reads']['germline']
                for locus in loci_totals:
                    if locus not in result:
                        result[locus] = [0]
                    loci_min[locus] = loci_totals[locus][0] * (min_threshold/100.0)

            if 'clones' in d and d['clones'] is not None:
                for clone in d["clones"]:
                    germline = clone['germline']
                    if clone['reads'][0] >=  loci_min[germline]:
                        result[germline][0] += 1
            elif d["clones"] is None:
                # Be robust against 'null' values for clones
                d["clones"] = []
            
        except ValueError as e:
            print('invalid_json')
            return "FAIL"
    
    d['reads']['distribution'] = result
    with open(filename, 'w') as extra:
        json.dump(d, extra)
    return "SUCCESS"

def schedule_run(id_sequence, id_config, grep_reads=None):
    db._adapter.reconnect()
    
    ts = time.time()
    data_id = db.results_file.insert(sequence_file_id = id_sequence,
                                     run_date = datetime.datetime.fromtimestamp(ts).strftime('%Y-%m-%d %H:%M:%S'),
                                     hidden = grep_reads is not None, 
                                     config_id = id_config )
        
    args = [id_sequence, id_config, data_id, grep_reads]

    err = assert_scheduler_task_does_not_exist(str(args))
    if err:
        log.error(err)
        return err

    program = db.config[id_config].program

    ## add task to scheduler
    task_id = register_task(TASK_NAME_PROCESS, args)
    db.results_file[data_id] = dict(scheduler_task_id = task_id)
    update_task(task_id, STATUS_QUEUED)
    run_process.delay(task_id, program, args)

    filename = db.sequence_file[id_sequence].filename
    res = {"redirect": "reload",
           "results_file_id": data_id,
           "message": "[%s] c%s: process requested - %s %s" % (data_id, id_config, grep_reads, filename)}
    log.info(res)
    return res


def schedule_fuse(sample_set_ids, config_ids):
    for sample_set_id in sample_set_ids:
        for config_id in config_ids:
            
            row = db((db.sample_set_membership.sample_set_id == sample_set_id)
                   & (db.sample_set_membership.sequence_file_id == db.results_file.sequence_file_id)
                   & (db.results_file.config_id == config_id)
                   & (db.results_file.hidden == False)
                ).select(db.sample_set_membership.sample_set_id, db.sample_set_membership.sequence_file_id,
                        db.results_file.id, db.results_file.config_id).first()
            
            if row:
                run_fuse.delay(
                    row.sample_set_membership.sequence_file_id, 
                    row.results_file.config_id, 
                    row.results_file.id, 
                    row.sample_set_membership.sample_set_id, 
                    clean_before = False)

def run_vidjil(task_id, id_file, id_config, id_data, grep_reads, clean_after=False):
    from subprocess import Popen, PIPE, STDOUT, os
    db._adapter.reconnect()
    
    print("run_vidjil start")

    if db.sequence_file[id_file] == None:
        print("Sequence file not found in DB (delay of upload/processing ?)")
        update_task(task_id, STATUS_FAILED)
        raise ValueError('Process has failed, no entrie in DB for this sequence file')

    if db.sequence_file[id_file].pre_process_flag == STATUS_FAILED :
        print("Pre-process has failed")
        update_task(task_id, STATUS_FAILED)
        raise ValueError('pre-process has failed')
    
    ## re schedule if pre_process is still pending
    if db.sequence_file[id_file].pre_process_flag and db.sequence_file[id_file].pre_process_flag != STATUS_COMPLETED:
        
        print("Pre-process is still pending, re-schedule")
    
        args = [id_file, id_config, id_data, grep_reads]
        run_process.apply_async((task_id, "vidjil", args), countdown=1200)
        update_task(task_id, STATUS_WAITING)
        return

    update_task(task_id, STATUS_RUNNING)
    
    ## les chemins d'acces a vidjil / aux fichiers de sequences
    upload_folder = defs.DIR_SEQUENCES
    out_folder = defs.DIR_OUT_VIDJIL_ID % id_data
    
    cmd = "rm -rf "+out_folder 
    p = Popen(cmd, shell=True, stdin=PIPE, stdout=PIPE, stderr=STDOUT, close_fds=True)
    p.wait()
    
    ## filepath du fichier de séquence
    row = db(db.sequence_file.id==id_file).select()
    filename = row[0].data_file
    output_filename = defs.BASENAME_OUT_VIDJIL_ID % id_data
    seq_file = upload_folder+filename

    ## config de vidjil
    vidjil_cmd = db.config[id_config].command

    if 'next' in vidjil_cmd:
        vidjil_cmd = vidjil_cmd.replace('next', '')
        vidjil_cmd = vidjil_cmd.replace(' germline' , defs.DIR_GERMLINE_NEXT)
        cmd = defs.DIR_VIDJIL_NEXT + '/vidjil-algo '
    else:
        vidjil_cmd = vidjil_cmd.replace(' germline' , defs.DIR_GERMLINE)
        cmd = defs.DIR_VIDJIL + '/vidjil-algo '

    if grep_reads:
        if re.match(r"^[acgtnACGTN]+$", grep_reads):
            vidjil_cmd += ' --out-clone-files --grep-reads "%s" ' % grep_reads
    
    os.makedirs(out_folder)
    out_log = out_folder+'/'+output_filename+'.vidjil.log'
    vidjil_log_file = open(out_log, 'w')

    try:
        ## commande complete
        cmd += ' -o  ' + out_folder + " -b " + output_filename
        cmd += ' ' + vidjil_cmd + ' '+ seq_file

        ## execute la commande vidjil
        print("=== Launching Vidjil ===")
        print(cmd)    
        print("========================")
        sys.stdout.flush()

        p = Popen(cmd, shell=True, stdin=PIPE, stdout=vidjil_log_file, stderr=STDOUT, close_fds=True)

        (stdoutdata, stderrdata) = p.communicate()

        print("Output log in " + out_log)
        sys.stdout.flush()
        db.commit()

        ## Get result file
        if grep_reads:
            out_results = out_folder + '/seq/clone.fa-1'
        else:
            out_results = out_folder + '/' + output_filename + '.vidjil'

        print("===>", out_results)
        results_filepath = os.path.abspath(out_results)

        stream = open(results_filepath, 'rb')
    except:
        print("!!! Vidjil failed, no result file")
        res = {"message": "[%s] c%s: Vidjil FAILED - %s; log at %s/%s.vidjil.log" % (id_data, id_config, out_folder, out_folder, output_filename)}
        log.error(res)
        update_task(task_id, STATUS_FAILED)
        raise
    
    ## Parse some info in .log
    vidjil_log_file.close()

    segmented = re.compile(r"==> segmented (\d+) reads \((\d*\.\d+|\d+)%\)")
    windows = re.compile(r"==> found (\d+) .*-windows in .* segments .* inside (\d+) sequences")
    info = ''
    reads = None
    segs = None
    ratio = None
    wins = None
    for l in open(out_log, 'r', encoding='utf-8'):
        m = segmented.search(l)
        if m:
            print(l, end=' ')
            segs = int(m.group(1))
            ratio = m.group(2)
            info = "%d segmented (%s%%)" % (segs, ratio)
            continue
        m = windows.search(l)
        if m:
            print(l, end=' ')
            wins = int(m.group(1))
            reads = int(m.group(2))
            info = "%d reads, " % reads + info + ", %d windows" % wins
            break


    ## insertion dans la base de donnée
    ts = time.time()
    db.results_file[id_data] = dict(run_date = datetime.datetime.fromtimestamp(ts).strftime('%Y-%m-%d %H:%M:%S'),
                                    data_file = stream)
    db.commit()
    
    if clean_after:
        clean_cmd = "rm -rf " + out_folder 
        p = Popen(clean_cmd, shell=True, stdin=PIPE, stdout=PIPE, stderr=STDOUT, close_fds=True)
        p.wait()
    
    ## l'output de Vidjil est stocké comme resultat pour l'ordonnanceur
    ## TODO parse result success/fail

    if not grep_reads:
        compute_extra(id_file, id_config, 5)
        for row in db(db.sample_set_membership.sequence_file_id==id_file).select() :
            sample_set_id = row.sample_set_id
            print(row.sample_set_id)
            run_fuse.delay(id_file, id_config, id_data, sample_set_id, clean_before = False)

    os.remove(results_filepath)
    update_task(task_id, STATUS_COMPLETED)

def run_igrec(id_file, id_config, id_data, clean_before=False, clean_after=False):
    from subprocess import Popen, PIPE, STDOUT, os
    import time
    import json

    upload_folder = defs.DIR_SEQUENCES
    out_folder = defs.DIR_OUT_VIDJIL_ID % id_data

    # FIXME Use shutil instead
    cmd = "rm -rf "+out_folder
    p = Popen(cmd, shell=True, stdin=PIPE, stdout=PIPE, stderr=STDOUT, close_fds=True)
    p.wait()

    ## filepath du fichier de séquence
    row = db(db.sequence_file.id==id_file).select()
    filename = row[0].data_file
    output_filename = defs.BASENAME_OUT_VIDJIL_ID % id_data
    seq_file = upload_folder+filename

    ## config de vidjil
    arg_cmd = db.config[id_config].command

    os.makedirs(out_folder)
    out_log = out_folder + '/vidjil-igrec.log'
    log_file = open(out_log, 'w')

    out_results = out_folder + "/out/igrec.vidjil"
    ## commande complete
    try:
        igrec = defs.DIR_IGREC + '/igrec.py'
        if not os.path.isfile(igrec):
            print("!!! IgReC binary file not found")
        cmd = "%s -s %s -o %s/out %s" % (igrec, seq_file, out_folder, arg_cmd)

        ## execute la commande IgReC
        print("=== Launching IgReC ===")
        print(cmd)
        print("========================")
        sys.stdout.flush()

        p = Popen(cmd, shell=True, stdin=PIPE, stdout=log_file, stderr=STDOUT, close_fds=True)
        p.wait()

        print("Output log in " + out_log)
        sys.stdout.flush()

        ## Get result file
        print("===>", out_results)
        results_filepath = os.path.abspath(out_results)
        stream = open(results_filepath, 'rb')
        stream.close()
    except:
        print("!!! IgReC failed, no result file")
        res = {"message": "[%s] c%s: IgReC FAILED - %s" % (id_data, id_config, out_folder)}
        log.error(res)
        raise

    original_name = row[0].data_file
    with open(results_filepath, 'r') as json_file:
        my_json = json.load(json_file)
        fill_field(my_json, original_name, "original_names", "samples")
        fill_field(my_json, cmd, "commandline", "samples")

        # TODO fix this dirty hack to get around bad file descriptor error
    new_file = open(results_filepath, 'w')
    json.dump(my_json, new_file)
    new_file.close()

    ## insertion dans la base de donnée
    ts = time.time()

    stream = open(results_filepath, 'rb')
    db.results_file[id_data] = dict(status = "ready",
                                 run_date = datetime.datetime.fromtimestamp(ts).strftime('%Y-%m-%d %H:%M:%S'),
                                 data_file = stream
                                )

    db.commit()

    config_name = db.config[id_config].name
    res = {"message": "[%s] c%s: IgReC - %s" % (id_data, id_config, out_folder)}
    log.info(res)

    for row in db(db.sample_set_membership.sequence_file_id==id_file).select() :
        sample_set_id = row.sample_set_id
        print(row.sample_set_id)
        run_fuse(id_file, id_config, id_data, sample_set_id, clean_before = False)


    return "SUCCESS"

def run_mixcr(id_file, id_config, id_data, clean_before=False, clean_after=False):
    from subprocess import Popen, PIPE, STDOUT, os
    import time
    import json

    upload_folder = defs.DIR_SEQUENCES
    out_folder = defs.DIR_OUT_VIDJIL_ID % id_data

    cmd = "rm -rf "+out_folder
    p = Popen(cmd, shell=True, stdin=PIPE, stdout=PIPE, stderr=STDOUT, close_fds=True)
    p.wait()

    ## filepath du fichier de séquence
    row = db(db.sequence_file.id==id_file).select()
    filename = row[0].data_file
    output_filename = defs.BASENAME_OUT_VIDJIL_ID % id_data
    seq_file = upload_folder+filename

    ## config de vidjil
    arg_cmd = db.config[id_config].command

    os.makedirs(out_folder)
    out_log = out_folder + output_filename+'.mixcr.log'
    report = out_folder + output_filename + '.mixcr.report'
    log_file = open(out_log, 'w')

    out_alignments = out_folder + output_filename + '.align.vdjca'
    out_clones =  out_folder + output_filename + '.clones.clns'
    out_results_file = output_filename + '.mixcr'
    out_results = out_folder + out_results_file

    align_report = report + '.aln'
    assembly_report = report + '.asmbl'

    arg_cmds = arg_cmd.split('|')
    args_1, args_2, args_3 = '', '', ''
    try:
        args_1, args_2, args_3 = arg_cmds
    except:
        print(arg_cmd)
        print("! Bad arguments, we expect args_align | args_assemble | args_exportClones")

    ## commande complete
    try:
        mixcr = defs.DIR_MIXCR + 'mixcr'
        cmd = mixcr + ' align --save-reads -t 1 -r ' + align_report + ' ' + args_1 + ' ' + seq_file  + ' ' + out_alignments
        cmd += ' && '
        cmd += mixcr + ' assemble -t 1 -r ' + assembly_report + ' ' + args_2 + ' ' + out_alignments + ' ' + out_clones
        cmd += ' && rm ' + out_alignments
        cmd += ' && '
        cmd += mixcr + ' exportClones --format vidjil -germline -id -name -reads -sequence -top -seg -s ' + args_3 + ' ' + out_clones + ' ' + out_results

        ## execute la commande MiXCR
        print("=== Launching MiXCR ===")
        print(cmd)
        print("========================")
        sys.stdout.flush()

        p = Popen(cmd, shell=True, stdin=PIPE, stdout=log_file, stderr=STDOUT, close_fds=True)
        p.wait()

        print("Output log in " + out_log)
        sys.stdout.flush()

        ## Get result file
        print("===>", out_results)
        results_filepath = os.path.abspath(out_results)
        stream = open(results_filepath, 'rb')
        stream.close()
    except:
        print("!!! MiXCR failed, no result file")
        res = {"message": "[%s] c%s: MiXCR FAILED - %s" % (id_data, id_config, out_folder)}
        log.error(res)
        raise

    align_report = get_file_content(align_report)
    assembly_report = get_file_content(assembly_report)
    reports = align_report + assembly_report
    original_name = row[0].data_file
    totalReads = extract_total_reads(assembly_report)
    with open(results_filepath, 'r') as json_file:
        my_json = json.load(json_file)
        fill_field(my_json, reports, "log", "samples", True)
        fill_field(my_json, original_name, "original_names", "samples")
        fill_field(my_json, cmd, "commandline", "samples")
        fill_field(my_json, totalReads, "total", "reads")

        # TODO fix this dirty hack to get around bad file descriptor error
    new_file = open(results_filepath, 'w')
    json.dump(my_json, new_file)
    new_file.close()

    ## insertion dans la base de donnée
    ts = time.time()
    
    stream = open(results_filepath, 'rb')
    db.results_file[id_data] = dict(status = "ready",
                                 run_date = datetime.datetime.fromtimestamp(ts).strftime('%Y-%m-%d %H:%M:%S'),
                                 data_file = stream
                                )
    
    db.commit()

    config_name = db.config[id_config].name
    res = {"message": "[%s] c%s: MiXCR finished - %s" % (id_data, id_config, out_folder)}
    log.info(res)

    for row in db(db.sample_set_membership.sequence_file_id==id_file).select() :
        sample_set_id = row.sample_set_id
        print(row.sample_set_id)
        run_fuse(id_file, id_config, id_data, sample_set_id, clean_before = False)

    os.remove(results_filepath)

    return "SUCCESS"

def run_copy(task_id, id_file, id_config, id_data, grep_reads, clean_before=False, clean_after=False):
    from subprocess import Popen, PIPE, STDOUT, os
    db._adapter.reconnect()
    
    ## les chemins d'acces a vidjil / aux fichiers de sequences
    upload_folder = defs.DIR_SEQUENCES
    output_filename = defs.BASENAME_OUT_VIDJIL_ID % id_data
    out_folder = defs.DIR_OUT_VIDJIL_ID % id_data
    
    cmd = "rm -rf "+out_folder 
    p = Popen(cmd, shell=True, stdin=PIPE, stdout=PIPE, stderr=STDOUT, close_fds=True)
    p.wait()
    
    ## filepath du fichier de séquence
    row = db(db.sequence_file.id==id_file).select()
    filename = row[0].data_file
    
    os.makedirs(out_folder)
    vidjil_log_file = open(out_folder+'/'+output_filename+'.vidjil.log', 'w')

    print("Output log in "+out_folder+'/'+output_filename+'.vidjil.log')
    sys.stdout.flush()
    db.commit()
    
    ## récupération du fichier 
    results_filepath = os.path.abspath(defs.DIR_SEQUENCES+row[0].data_file)

    try:
        stream = open(results_filepath, 'rb')
        update_task(task_id, STATUS_COMPLETED)
    except IOError as error:
        print("!!! 'copy' failed, no file")
        res = {"message": "[%s] c%s: 'copy' FAILED - %s - %s" % (id_data, id_config, error, out_folder)}
        log.error(res)
        raise IOError
    
    ## insertion dans la base de donnée
    ts = time.time()
    
    db.results_file[id_data] = dict(status = "ready",
                                 run_date = datetime.datetime.fromtimestamp(ts).strftime('%Y-%m-%d %H:%M:%S'),
                                 #data_file = row[0].data_file
                                 data_file = db.results_file.data_file.store(stream, row[0].filename)
                                )
    db.commit()
    
    if clean_after:
        clean_cmd = "rm -rf " + out_folder 
        p = Popen(clean_cmd, shell=True, stdin=PIPE, stdout=PIPE, stderr=STDOUT, close_fds=True)
        p.wait()
    
    ## l'output de Vidjil est stocké comme resultat pour l'ordonnanceur
    ## TODO parse result success/fail

    res = {"message": "[%s] c%s: 'copy' finished - %s" % (id_data, id_config, filename)}
    log.info(res)

    for row in db(db.sample_set_membership.sequence_file_id==id_file).select() :
        sample_set_id = row.sample_set_id
        print(row.sample_set_id)
        run_fuse(id_file, id_config, id_data, sample_set_id, clean_before = False)

    return "SUCCESS"


def run_refuse(args):
    for arg in args:
        run_fuse(arg[0], arg[1], arg[2], arg[3], arg[4])
    return "SUCCESS"

@scheduler.task()
def run_fuse(id_file, id_config, id_data, sample_set_id, clean_before=True, clean_after=False):
    from subprocess import Popen, PIPE, STDOUT, os
    db._adapter.reconnect()

    out_folder = defs.DIR_OUT_VIDJIL_ID % id_data
    output_filename = defs.BASENAME_OUT_VIDJIL_ID % id_data + '-%s' % sample_set_id
    
    if clean_before:
        cmd = "rm -rf "+out_folder 
        p = Popen(cmd, shell=True, stdin=PIPE, stdout=PIPE, stderr=STDOUT, close_fds=True)
        p.wait()
        os.makedirs(out_folder)    
    
    
    fuse_log_file = open(out_folder+'/'+output_filename+'.fuse.log', 'w')
    
    ## fuse.py 
    output_file = out_folder+'/'+output_filename+'.fused'
    files = ""
    sequence_file_list = ""

    query2 = db( ( db.results_file.sequence_file_id == db.sequence_file.id )
                   & ( db.sample_set_membership.sequence_file_id == db.sequence_file.id)
                   & ( db.sample_set_membership.sample_set_id == sample_set_id)
                   & ( db.results_file.config_id == id_config )
                   & ( db.results_file.hidden == False)
                   ).select( orderby=db.sequence_file.id|~db.results_file.run_date) 

    query = []
    sequence_file_id = 0
    for row in query2 : 
        if row.sequence_file.id != sequence_file_id :
            query.append(row)
            sequence_file_id = row.sequence_file.id
            
    for row in query :
        if row.results_file.data_file is not None :
            res_file = defs.DIR_RESULTS + row.results_file.data_file
            if row.sequence_file.pre_process_file:
                pre_file = "%s/%s" % (defs.DIR_RESULTS, row.sequence_file.pre_process_file)
                files += "%s,%s" % (res_file, pre_file)
            else:
                files += res_file
            files += " "
            sequence_file_list += str(row.results_file.sequence_file_id) + "_"
            
    if files == "":
        print("!!! Fuse failed: no files to fuse")
        res = {"message": "[%s] c%s: 'fuse' FAILED - %s no files to fuse" % (id_data, id_config, output_file)}
        log.error(res)
        return STATUS_FAILED

    try:
        fuse_cmd = db.config[id_config].fuse_command
        cmd = "python "+defs.DIR_FUSE+"/fuse.py -o "+ output_file + " " + fuse_cmd + " " + files


        print("=== fuse.py ===")
        print(cmd)
        print("===============")
        sys.stdout.flush()

        p = Popen(cmd, shell=True, stdin=PIPE, stdout=fuse_log_file, stderr=STDOUT, close_fds=True)
        (stdoutdata, stderrdata) = p.communicate()
        print("Output log in "+out_folder+'/'+output_filename+'.fuse.log')

        fuse_filepath = os.path.abspath(output_file)

        stream = open(fuse_filepath, 'rb')
    except:
        print("!!! Fuse failed, no .fused file")
        res = {"message": "[%s] c%s: 'fuse' FAILED - %s" % (id_data, id_config, output_file)}
        log.error(res)
        raise

    ts = time.time()

    fused_files = db( ( db.fused_file.config_id == id_config ) &
                     ( db.fused_file.sample_set_id == sample_set_id )
                 ).select()

    existing_fused_file = None
    if len(fused_files) > 0:
        fused_file = fused_files[0]
        id_fuse = fused_file.id
        existing_fused_file = fused_file.fused_file
    else:
        id_fuse = db.fused_file.insert(sample_set_id = sample_set_id,
                                       config_id = id_config)

    db.fused_file[id_fuse].update_record( fuse_date = datetime.datetime.fromtimestamp(ts).strftime('%Y-%m-%d %H:%M:%S'),
                                 fused_file = stream,
                                 sequence_file_list = sequence_file_list)
    db.commit()

    if clean_after:
        clean_cmd = "rm -rf " + out_folder 
        p = Popen(clean_cmd, shell=True, stdin=PIPE, stdout=PIPE, stderr=STDOUT, close_fds=True)
        p.wait()
        # remove previous fused_file if it exists
        if existing_fused_file is not None:
            clean_cmd = "rm -rf %s/%s" % (out_folder, existing_fused_file)
            p = Popen(clean_cmd, shell=True, stdin=PIPE, stdout=PIPE, stderr=STDOUT, close_fds=True)
            p.wait()
    
    res = {"message": "[%s] c%s: 'fuse' finished - %s" % (id_data, id_config, db.fused_file[id_fuse].fused_file)}
    log.info(res)

    # Remove temporary fused file
    os.remove(output_file)

    return "SUCCESS"

def custom_fuse(file_list):
    from subprocess import Popen, PIPE, STDOUT, os

    if defs.PORT_FUSE_SERVER is None:
        raise IOError('This server cannot fuse custom data')
    random_id = random.randint(99999999,99999999999)
    out_folder = os.path.abspath(defs.DIR_OUT_VIDJIL_ID % random_id)
    output_filename = defs.BASENAME_OUT_VIDJIL_ID % random_id
    
    cmd = "rm -rf "+out_folder 
    p = Popen(cmd, shell=True, stdin=PIPE, stdout=PIPE, stderr=STDOUT, close_fds=True)
    p.wait()
    os.makedirs(out_folder)    

    res = {"message": "'custom fuse' (%d files): %s" % (len(file_list), ','.join(file_list))}
    log.info(res)
        
    ## fuse.py 
    output_file = out_folder+'/'+output_filename+'.fused'
    files = ""
    for id in file_list :
        if db.results_file[id].data_file is not None :
            files += os.path.abspath(defs.DIR_RESULTS + db.results_file[id].data_file)
            seq_file = db.sequence_file[db.results_file[id].sequence_file_id]
            if seq_file.pre_process_file is not None:
                files += ",%s" % os.path.abspath(defs.DIR_RESULTS + seq_file.pre_process_file)
            files += " "
    
    try:
        cmd = "python "+ os.path.abspath(os.path.join(defs.DIR_FUSE, "fuse.py")) + " -o " + output_file + " -t 100 " + files
        proc_srvr = xmlrpc.client.ServerProxy("http://%s:%d" % (defs.FUSE_SERVER, defs.PORT_FUSE_SERVER))
        fuse_filepath = proc_srvr.fuse(cmd, out_folder, output_filename)
    
        f = open(fuse_filepath, 'rb')
        data = json.loads(f.read())
    except:
        res = {"message": "'custom fuse' -> IOError"}
        log.error(res)
        raise

    clean_cmd = "rm -rf " + out_folder 
    p = Popen(clean_cmd, shell=True, stdin=PIPE, stdout=PIPE, stderr=STDOUT, close_fds=True)
    p.wait()

    res = {"message": "'custom fuse' -> finished"}
    log.info(res)

    return data

#TODO move this ?
def get_file_content(filename):
    content = ""
    with open(filename, 'rb') as my_file:
        content = my_file.read()
    return content

def fill_field(dest, value, field, parent="", append=False):
    if parent is not None and parent != "":
        dest = dest[parent]

    if field in dest:
        if append:
            dest[field][0] += value
        else:
            dest[field][0] = value
    else:
        dest[field] = []
        dest[field].append(value)

def extract_total_reads(report):
    reads_matcher = re.compile(r"Total Reads analysed: [0-9]+")
    reads_line = reads_matcher.search(report).group()
    return reads_line.split(' ')[-1]

def schedule_pre_process(sequence_file_id, pre_process_id):
    from subprocess import Popen, PIPE, STDOUT, os

    args = [pre_process_id, sequence_file_id]

    err = assert_scheduler_task_does_not_exist(str(args))
    if err:
        log.error(err)
        return err

    task_id = register_task("pre_process", args)
    db.sequence_file[sequence_file_id] = dict(pre_process_scheduler_task_id = task_id)

    update_task(task_id, STATUS_QUEUED)
    run_pre_process.delay(pre_process_id, sequence_file_id, task_id, clean_before=True, clean_after=False)

    res = {"redirect": "reload",
           "message": "{%s} (%s): process requested" % (sequence_file_id, pre_process_id)}

    log.info(res)
    return res


def get_preprocessed_filename(filename1, filename2):
    '''
    Get the same extension and then get the most common among them

    >>> get_preprocessed_filename('lsdkj_toto-tata_mlkmfsdlkf.fastq.gz', 'rete_toto-tata_eekjdf.fastq.gz')
    '_toto-tata_.fastq.gz'
    '''
    if not filename2:
        return filename1
    extension = tools_utils.get_common_suffpref([filename1, filename2], min(len(filename1), len(filename2)), -1)
    without_extension = [x[0:-len(extension)] for x in [filename1, filename2]]
    common = tools_utils.common_substring(without_extension)
    if len(common) == 0:
        common = '_'.join(without_extension)
    return common+extension




@scheduler.task()
def run_pre_process(pre_process_id, sequence_file_id, task_id, clean_before=True, clean_after=False):
    '''
    Run a pre-process on sequence_file.data_file (and possibly sequence_file.data_file+2),
    put the output back in sequence_file.data_file.
    '''
    from subprocess import Popen, PIPE, STDOUT, os

    try:
        db._adapter.reconnect()
        sequence_file = db.sequence_file[sequence_file_id]
        db.sequence_file[sequence_file_id] = dict(pre_process_flag = STATUS_RUNNING)
        update_task(task_id, STATUS_RUNNING)
        db.commit()
    except:
        db.rollback()
    
    out_folder = defs.DIR_PRE_VIDJIL_ID % sequence_file_id
    output_filename = get_preprocessed_filename(get_original_filename(sequence_file.data_file),
                                                get_original_filename(sequence_file.data_file2))
    
    if clean_before:
        cmd = "rm -rf "+out_folder 
        p = Popen(cmd, shell=True, stdin=PIPE, stdout=PIPE, stderr=STDOUT, close_fds=True)
        p.wait()
        os.makedirs(out_folder)    

    output_file = out_folder+'/'+output_filename
            
    pre_process = db.pre_process[pre_process_id]

    try:
        cmd = pre_process.command.replace( "&file1&", defs.DIR_SEQUENCES + sequence_file.data_file)
        if sequence_file.data_file2:
            cmd = cmd.replace( "&file2&", defs.DIR_SEQUENCES + sequence_file.data_file2)
        cmd = cmd.replace( "&result&", output_file)
        cmd = cmd.replace("&pear&", defs.DIR_PEAR)
        cmd = cmd.replace("&flash2&", defs.DIR_FLASH2)
        cmd = cmd.replace("&binaries&", defs.DIR_BINARIES)
        # Example of template to add some preprocess shortcut
        # cmd = cmd.replace("&preprocess_template&", defs.DIR_preprocess_template)
        # Where &preprocess_template& is the shortcut to change and
        # defs.DIR_preprocess_template the variable to set into the file defs.py. 
        # The value should be the path to access to the preprocess software.

        print("=== Pre-process %s ===" % pre_process_id)
        print(cmd)
        print("===============")
        sys.stdout.flush()

        out_log = out_folder+'/'+output_filename+'.pre.log'
        log_file = open(out_log, 'w')

        os.chdir(defs.DIR_PREPROCESS)
        p = Popen(cmd, shell=True, stdin=PIPE, stdout=log_file, stderr=log_file, close_fds=True)
        (stdoutdata, stderrdata) = p.communicate()
        print("Output log in " + out_log)

        filepath = os.path.abspath(output_file)

        stream = open(filepath, 'rb')

    except:
        print("!!! Pre-process failed, no result file")
        res = {"message": "{%s} p%s: 'pre_process' FAILED - %s" % (sequence_file_id, pre_process_id, output_file)}
        log.error(res)
        db.sequence_file[sequence_file_id] = dict(pre_process_flag = STATUS_FAILED)
        update_task(task_id, STATUS_FAILED)
        db.commit()
        raise

    pre_process_filepath = '%s/pre_process.vidjil' % out_folder
    try:
        pre_process_output = open(pre_process_filepath, 'rb')
    except FileNotFoundError:
        pre_process_output = None

    # Now we update the sequence file with the result of the pre-process
    # We forget the initial data_file (and possibly data_file2)
    db._adapter.reconnect()
    db.sequence_file[sequence_file_id] = dict(data_file = stream,
                                              data_file2 = None,
                                              pre_process_flag = STATUS_COMPLETED,
                                              pre_process_file = pre_process_output)
    db.commit()
    update_task(task_id, STATUS_COMPLETED)
    
    # resume WAITING task for this sequence file
    waiting_tasks = db((db.results_file.sequence_file_id == sequence_file_id) & 
                       (db.results_file.scheduler_task_id == db.scheduler_task.id) & 
                       (db.scheduler_task.status == STATUS_WAITING)).select()
    for row in waiting_tasks :
        update_task(row.scheduler_task.id, STATUS_QUEUED)

    # Dump log in scheduler_run.run_output
    log_file.close()
    for l in open(out_log):
        print(l, end=' ')

    # Remove data file from disk to save space (it is now saved elsewhere)
    os.remove(filepath)
    # Remove original sequence file after preprocess as no more needed and avaialable
    try:
        os.remove(defs.DIR_SEQUENCES + sequence_file.data_file)
        os.remove(defs.DIR_SEQUENCES + sequence_file.data_file2)
    except:
        log.error(f"[pre_process_id={pre_process_id}] [sequence_file_id={sequence_file_id}] Removing file at the end of preprocess failed.")

    try:
        os.remove(pre_process_filepath)
    except:
        pass
    
    if clean_after:
        clean_cmd = "rm -rf " + out_folder 
        p = Popen(clean_cmd, shell=True, stdin=PIPE, stdout=PIPE, stderr=STDOUT, close_fds=True)
        p.wait()
    
    res = {"message": "{%s} p%s: 'pre_process' finished - %s" % (sequence_file_id, pre_process_id, output_file)}
    log.info(res)

    return "SUCCESS"
    


@scheduler.task()
def run_process(task_id, program, args):
    db._adapter.reconnect()
    if program == "vidjil" :
        run_vidjil(task_id, args[0],args[1],args[2],args[3])
    elif program == "none" :
        run_copy(task_id, args[0],args[1],args[2],args[3])
