# coding: utf8
from __future__ import print_function

import json
import os
import defs
import re
import os.path
import time
import sys
import datetime
import random
import xmlrpclib
import tools_utils

def assert_scheduler_task_does_not_exist(args):
    ##check scheduled run
    row = db( ( db.scheduler_task.args == args)
         & ( db.scheduler_task.status != "FAILED"  )
         & ( db.scheduler_task.status != "EXPIRED"  )
         & ( db.scheduler_task.status != "TIMEOUT"  )
         & ( db.scheduler_task.status != "COMPLETED"  )
         ).select()

    if len(row) > 0 :
        res = {"message": "task already registered"}
        return res

    return None

def compute_contamination(sequence_file_id, results_file_id, config_id):
    result = []
    for i in range(0, len(sequence_file_id)) :
        result.append({})
        result[i]["total_clones"]=0
        result[i]["total_reads"]=0
        result[i]["sample"]={}
        
        #open sample
        with open(defs.DIR_RESULTS+db.results_file[results_file_id[i]].data_file, "r") as json_data:
            d = json.load(json_data)
            list1 = {}
            total_reads1=d["reads"]["segmented"][0]
            for clone in d["clones"]:
                list1[clone["id"]] = clone["reads"][0]
            json_data.close()
        
        #iterate trough others run's samples
        sample_set_run = db( (db.sample_set_membership.sequence_file_id == sequence_file_id[i])
                           & (db.sample_set_membership.sample_set_id == db.sample_set.id)
                           & (db.sample_set.sample_type == "run") ).select().first()
        
        if sample_set_run != None :
            sample_set_id = sample_set_run.sample_set.id
            query = db(  ( db.sample_set.id == sample_set_id )
                       & ( db.sample_set.id == db.sample_set_membership.sample_set_id )
                       & ( db.sequence_file.id == db.sample_set_membership.sequence_file_id)
                       & ( db.sequence_file.id != sequence_file_id[i])
                       & ( db.results_file.sequence_file_id == db.sequence_file.id )
                       & ( db.results_file.config_id == config_id[i]  )
                       ).select(db.sequence_file.ALL,db.results_file.ALL, db.sample_set.id, orderby=db.sequence_file.id|~db.results_file.run_date)

            query2 = []
            sfi = 0
            for row in query : 
                if row.sequence_file.id != sfi :
                    query2.append(row)
                    sfi = row.sequence_file.id
            
            for row in query2 :
                print(defs.DIR_RESULTS+row.results_file.data_file)
                result[i]["sample"][row.results_file.id] = {}
                result[i]["sample"][row.results_file.id]["clones"] = 0
                result[i]["sample"][row.results_file.id]["reads"] = 0
                with open(defs.DIR_RESULTS+row.results_file.data_file, "r") as json_data2:
                    try:
                        d = json.load(json_data2)
                        total_reads2=d["reads"]["segmented"][0]
                        for clone in d["clones"]:
                            if clone["id"] in list1 :
                                if clone["reads"][0] > 10*list1[clone["id"]] :
                                    result[i]["total_clones"] += 1
                                    result[i]["total_reads"] += list1[clone["id"]]
                                    result[i]["sample"][row.results_file.id]["clones"] += 1
                                    result[i]["sample"][row.results_file.id]["reads"] += list1[clone["id"]]
                            
                    except ValueError as e:
                        print('invalid_json')
                    json_data2.close()


    return result
    

def schedule_run(id_sequence, id_config, grep_reads=None):
    from subprocess import Popen, PIPE, STDOUT, os

    #check results_file
    row = db( ( db.results_file.config_id == id_config ) & 
             ( db.results_file.sequence_file_id == id_sequence )  
             ).select()
    
    ts = time.time()
    data_id = db.results_file.insert(sequence_file_id = id_sequence,
                                     run_date = datetime.datetime.fromtimestamp(ts).strftime('%Y-%m-%d %H:%M:%S'),
                                     config_id = id_config )
        
    args = [id_sequence, id_config, data_id, grep_reads]

    err = assert_scheduler_task_does_not_exist(str(args))
    if err:
        log.error(err)
        return err

    program = db.config[id_config].program
    ##add task to scheduler
    task = scheduler.queue_task(program, args,
                                repeats = 1, timeout = defs.TASK_TIMEOUT)
    
    if db.sequence_file[id_sequence].pre_process_flag != "DONE" and db.sequence_file[id_sequence].pre_process_flag :
        db.scheduler_task[task.id] = dict(status ="STOPPED")
    
    db.results_file[data_id] = dict(scheduler_task_id = task.id)

    filename= db.sequence_file[id_sequence].filename

    res = {"redirect": "reload",
           "message": "[%s] c%s: process requested - %s %s" % (data_id, id_config, grep_reads, filename)}

    log.info(res)
    return res

def schedule_fuse(sample_set_ids, config_ids):
    args = []
    for sample_set_id in sample_set_ids:
        for config_id in config_ids:
            row = db((db.sample_set_membership.sample_set_id == sample_set_id)
                   & (db.sample_set_membership.sequence_file_id == db.results_file.sequence_file_id)
                   & (db.results_file.config_id == config_id)
                ).select(db.sample_set_membership.sample_set_id, db.sample_set_membership.sequence_file_id,
                        db.results_file.id, db.results_file.config_id).first()
            if row:
                args.append([row.sample_set_membership.sequence_file_id, row.results_file.config_id,
                row.results_file.id, row.sample_set_membership.sample_set_id, False])
    if len(args) > 0:
        task = scheduler.queue_task('refuse', [args],
                                    repeats = 1, timeout = defs.TASK_TIMEOUT)

def run_vidjil(id_file, id_config, id_data, grep_reads,
               clean_before=False, clean_after=False):
    from subprocess import Popen, PIPE, STDOUT, os
    from datetime import timedelta as timed
    
    ## re schedule if pre_process is still pending
    if db.sequence_file[id_file].pre_process_flag not in ["COMPLETED", "DONE"] and db.sequence_file[id_file].pre_process_flag:
        
        print("Pre-process is still pending, re-schedule")
    
        args = [id_file, id_config, id_data, grep_reads]
        task = scheduler.queue_task("vidjil", args,
                        repeats = 1, timeout = defs.TASK_TIMEOUT,
                               start_time=request.now + timed(seconds=1200))
        db.results_file[id_data] = dict(scheduler_task_id = task.id)
        db.commit()
        print(task.id)
        sys.stdout.flush()
        
        return "SUCCESS"
    
    if db.sequence_file[id_file].pre_process_flag == "FAILED" :
        print("Pre-process has failed")
        raise ValueError('pre-process has failed')
        return "FAIL"
    
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
        # TODO: security, assert grep_reads XXXX
        vidjil_cmd += ' -FaW "%s" ' % grep_reads
    
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
        res = {"message": "[%s] c%s: Vidjil FAILED - %s" % (id_data, id_config, out_folder)}
        log.error(res)
        raise
    
    ## Parse some info in .log
    vidjil_log_file.close()

    segmented = re.compile("==> segmented (\d+) reads \((\d*\.\d+|\d+)%\)")
    windows = re.compile("==> found (\d+) .*-windows in .* segments .* inside (\d+) sequences")
    info = ''
    reads = None
    segs = None
    ratio = None
    wins = None
    for l in open(out_log):
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
    
    db.results_file[id_data] = dict(status = "ready",
                                 run_date = datetime.datetime.fromtimestamp(ts).strftime('%Y-%m-%d %H:%M:%S'),
                                 data_file = stream
                                )
    
    db.commit()
    
    if clean_after:
        clean_cmd = "rm -rf " + out_folder 
        p = Popen(clean_cmd, shell=True, stdin=PIPE, stdout=PIPE, stderr=STDOUT, close_fds=True)
        p.wait()
    
    ## l'output de Vidjil est stocké comme resultat pour l'ordonnanceur
    ## TODO parse result success/fail

    config_name = db.config[id_config].name

    res = {"message": "[%s] c%s: Vidjil finished - %s - %s" % (id_data, id_config, info, out_folder)}
    log.info(res)


    if not grep_reads:
        for row in db(db.sample_set_membership.sequence_file_id==id_file).select() :
	    sample_set_id = row.sample_set_id
	    print(row.sample_set_id)
            run_fuse(id_file, id_config, id_data, sample_set_id, clean_before = False)

    return "SUCCESS"

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


    return "SUCCESS"

def run_copy(id_file, id_config, id_data, clean_before=False, clean_after=False):
    from subprocess import Popen, PIPE, STDOUT, os
    
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
    except IOError:
        print("!!! 'copy' failed, no file")
        res = {"message": "[%s] c%s: 'copy' FAILED - %s - %s" % (id_data, id_config, info, out_folder)}
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

def run_fuse(id_file, id_config, id_data, sample_set_id, clean_before=True, clean_after=False):
    from subprocess import Popen, PIPE, STDOUT, os
    
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
                   ).select( orderby=db.sequence_file.id|~db.results_file.run_date) 
    query = []
    sequence_file_id = 0
    for row in query2 : 
        if row.sequence_file.id != sequence_file_id :
            query.append(row)
            sequence_file_id = row.sequence_file.id
            
    for row in query :
        if row.results_file.data_file is not None :
            files += defs.DIR_RESULTS + row.results_file.data_file + " "
            sequence_file_list += str(row.results_file.sequence_file_id) + "_"
            
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

    db.fused_file[id_fuse] = dict(fuse_date = datetime.datetime.fromtimestamp(ts).strftime('%Y-%m-%d %H:%M:%S'),
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
            files += os.path.abspath(defs.DIR_RESULTS + db.results_file[id].data_file) + " "
    
    try:
        cmd = "python "+ os.path.abspath(defs.DIR_FUSE) +"/fuse.py -o "+output_file+" -t 100 "+files
        proc_srvr = xmlrpclib.ServerProxy("http://%s:%d" % (defs.FUSE_SERVER, defs.PORT_FUSE_SERVER))
        fuse_filepath = proc_srvr.fuse(cmd, out_folder, output_filename)
    
        f = open(fuse_filepath, 'rb')
        data = gluon.contrib.simplejson.loads(f.read())
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
    reads_matcher = re.compile("Total Reads analysed: [0-9]+")
    reads_line = reads_matcher.search(report).group()
    return reads_line.split(' ')[-1]

def schedule_pre_process(sequence_file_id, pre_process_id):
    from subprocess import Popen, PIPE, STDOUT, os


    args = [pre_process_id, sequence_file_id]

    err = assert_scheduler_task_does_not_exist(str(args))
    if err:
        log.error(err)
        return err

    task = scheduler.queue_task("pre_process", args,
                                repeats = 1, timeout = defs.TASK_TIMEOUT)
    db.sequence_file[sequence_file_id] = dict(pre_process_scheduler_task_id = task.id)
    
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


def run_pre_process(pre_process_id, sequence_file_id, clean_before=True, clean_after=False):
    '''
    Run a pre-process on sequence_file.data_file (and possibly sequence_file.data_file+2),
    put the output back in sequence_file.data_file.
    '''

    from subprocess import Popen, PIPE, STDOUT, os
    
    sequence_file = db.sequence_file[sequence_file_id]
    db.sequence_file[sequence_file_id] = dict(pre_process_flag = "RUN")
    db.commit()
    
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

        print("=== Pre-process %s ===" % pre_process_id)
        print(cmd)
        print("===============")
        sys.stdout.flush()

        out_log = out_folder+'/'+output_filename+'.pre.log'
        log_file = open(out_log, 'w')

        os.chdir(defs.DIR_FUSE)
        p = Popen(cmd, shell=True, stdin=PIPE, stdout=log_file, stderr=log_file, close_fds=True)
        (stdoutdata, stderrdata) = p.communicate()
        print("Output log in " + out_log)

        filepath = os.path.abspath(output_file)

        stream = open(filepath, 'rb')
    except:
        print("!!! Pre-process failed, no result file")
        res = {"message": "{%s} p%s: 'pre_process' FAILED - %s" % (sequence_file_id, pre_process_id, output_file)}
        log.error(res)
        db.sequence_file[sequence_file_id] = dict(pre_process_flag = "FAILED")
        db.commit()
        raise

        

    # Now we update the sequence file with the result of the pre-process
    # We forget the initial data_file (and possibly data_file2)
    db.sequence_file[sequence_file_id] = dict(data_file = stream,
                                              data_file2 = None,
                                              pre_process_flag = "DONE")
    db.commit()
    #resume STOPPED task for this sequence file
    stopped_task = db(
        (db.results_file.sequence_file_id == sequence_file_id)
        & (db.results_file.scheduler_task_id == db.scheduler_task.id)
        & (db.scheduler_task.status == "STOPPED")
    ).select()
    
    for row in stopped_task :
        db.scheduler_task[row.scheduler_task.id] = dict(status = "QUEUED")
        
    
    db.commit()

    # Dump log in scheduler_run.run_output
    log_file.close()
    for l in open(out_log):
        print(l, end=' ')

    # Remove data file from disk to save space (it is now saved elsewhere)
    os.remove(filepath)
    
    if clean_after:
        clean_cmd = "rm -rf " + out_folder 
        p = Popen(clean_cmd, shell=True, stdin=PIPE, stdout=PIPE, stderr=STDOUT, close_fds=True)
        p.wait()
    
    res = {"message": "{%s} p%s: 'pre_process' finished - %s" % (sequence_file_id, pre_process_id, output_file)}
    log.info(res)

    return "SUCCESS"
    
    
from gluon.scheduler import Scheduler
scheduler = Scheduler(db, dict(vidjil=run_vidjil,
                               compute_contamination=compute_contamination,
                               mixcr=run_mixcr,
                               igrec=run_igrec,
                               none=run_copy,
                               pre_process=run_pre_process,
                               refuse=run_refuse),
                        heartbeat=defs.SCHEDULER_HEARTBEAT)
