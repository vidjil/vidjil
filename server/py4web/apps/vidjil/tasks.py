# -*- coding: utf-8 -*-
import json
import pathlib
import shutil
import os
import re
import time
import traceback
import sys
import datetime
import random
import xmlrpc.client
import subprocess
from subprocess import Popen, PIPE, STDOUT
from apps.vidjil import defs
from apps.vidjil.modules import tools_utils, vidjil_utils
from .modules.sequenceFile import get_original_filename
from .common import scheduler, db, log

# Task status
STATUS_PENDING = "PENDING"
STATUS_QUEUED = "QUEUED"
STATUS_WAITING = "WAITING"
STATUS_RUNNING = "RUNNING"
STATUS_COMPLETED = "COMPLETED"
STATUS_FAILED = "FAILED"
STATUS_UPLOAD_FAILED = "UPLOAD_FAILED"

# Task names
TASK_NAME_PROCESS = "process"
TASK_NAME_PRE_PROCESS = "pre_process"

# REGEX
SEGMENTED_REGEX = re.compile(r"==> segmented (\d+) reads \((\d*\.\d+|\d+)%\)")
WINDOWS_REGEX = re.compile(r"==> found (\d+) .*-windows in .* segments .* inside (\d+) sequences")
READS_MATCHER_REGEX = re.compile(r"Total Reads analysed: [0-9]+")


def schedule_run(id_sequence, id_config, grep_reads=None):
    
    ts = time.time()
    data_id = db.results_file.insert(sequence_file_id = id_sequence,
                                     run_date = datetime.datetime.fromtimestamp(ts).strftime('%Y-%m-%d %H:%M:%S'),
                                     hidden = grep_reads is not None, 
                                     config_id = id_config )
    db.commit()
    args = [id_sequence, id_config, data_id, grep_reads]

    err = assert_scheduler_task_does_not_exist(str(args))
    if err:
        log.error(err)
        return err

    program = db.config[id_config].program

    ## add task to scheduler
    task_id = register_task(TASK_NAME_PROCESS, args)
    db.results_file[data_id].update_record(scheduler_task_id = task_id)
    db.commit()
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

def run_vidjil(task_id, id_file, id_config, id_data, grep_reads, clean_before=False, clean_after=False):
    log.info("run_vidjil start")

    sequence_file = db.sequence_file[id_file]
    log.debug(f"{sequence_file=}")

    if sequence_file is None:
        log.info("Sequence file not found in DB (delay of upload/processing ?)")
        update_task(task_id, STATUS_FAILED)
        raise ValueError('Process has failed, no entry in DB for this sequence file')

    if sequence_file.pre_process_flag == STATUS_FAILED :
        log.info("Pre-process has failed")
        update_task(task_id, STATUS_FAILED)
        raise ValueError('pre-process has failed')
    
    ## re schedule if pre_process is still pending
    if sequence_file.pre_process_flag and sequence_file.pre_process_flag != STATUS_COMPLETED:
        log.info("Pre-process is still pending, re-schedule")
        args = [id_file, id_config, id_data, grep_reads]
        run_process.apply_async((task_id, "vidjil", args), countdown=60)
        update_task(task_id, STATUS_WAITING)
        return

    update_task(task_id, STATUS_RUNNING)
    
    try:
        ## Path to vidjil/sequence files
        upload_folder = defs.DIR_SEQUENCES
        out_folder = defs.DIR_OUT_VIDJIL_ID % id_data
        filename = sequence_file.data_file
        seq_file = upload_folder + filename
        
        ## Clean
        shutil.rmtree(out_folder, ignore_errors=True)
        os.makedirs(out_folder)
        
        ## output file paths
        output_filename = defs.BASENAME_OUT_VIDJIL_ID % id_data
        out_log = out_folder+'/'+output_filename+'.vidjil.log'

        ## Vidjil config
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
                
        if sequence_file.pre_process_file:
            # reads json preprocess file to get number of reads
            preprocess_data = json.load(open(defs.DIR_RESULTS+"/"+sequence_file.pre_process_file))
            if "pre_process" in preprocess_data and "reads" in preprocess_data and "total" in preprocess_data["reads"] and len(preprocess_data['reads']['total']):
                cmd += f" --read-number {preprocess_data['reads']['total'][0]} "

        cmd += ' -o  ' + out_folder + " -b " + output_filename
        cmd += ' ' + vidjil_cmd + ' '+ seq_file

        try:
            ## execute vidjil command
            log.info("=== Launching Vidjil ===")
            log.info(cmd)    
            log.info("========================")
            sys.stdout.flush()

            with open(out_log, 'w') as vidjil_log_file:
                p = Popen(cmd, shell=True, stdin=PIPE, stdout=vidjil_log_file, stderr=STDOUT, close_fds=True)
                p.communicate()
                sys.stdout.flush()
                
            log.info("Vidjil done, output logs in " + out_log)

            ## Get result file
            if grep_reads:
                out_results = out_folder + '/seq/clone.fa-1'
            else:
                out_results = out_folder + '/' + output_filename + '.vidjil'
            log.info(f"===> {out_results}")
            results_filepath = os.path.abspath(out_results)
            if not os.path.exists(results_filepath):
                raise IOError(filename=results_filepath)
        except:
            error_message = f"!!! Vidjil failed : {traceback.format_exc()}\n\nSetting status to Failed."
            res = {"message": f"[{id_data}] c{id_config}: {error_message}; log at {out_folder}/{output_filename}.vidjil.log"}
            log.error(res)
            update_task(task_id, STATUS_FAILED)
            raise
        
        ## Parse some info in .log
        info = ''
        reads = None
        segs = None
        ratio = None
        wins = None
        with open(out_log, 'r', encoding='utf-8') as log_file:
            for line in log_file:
                match = SEGMENTED_REGEX.search(line)
                if match:
                    log.info(line, end=' ')
                    segs = int(match.group(1))
                    ratio = match.group(2)
                    info = "%d segmented (%s%%)" % (segs, ratio)
                    continue
                match = WINDOWS_REGEX.search(line)
                if match:
                    log.info(line, end=' ')
                    wins = int(match.group(1))
                    reads = int(match.group(2))
                    info = "%d reads, " % reads + info + ", %d windows" % wins
                    break

        ## Insert in database
        with open(results_filepath, 'rb') as stream:
            ts = time.time()
            db.results_file[id_data].update_record(
                run_date = datetime.datetime.fromtimestamp(ts).strftime('%Y-%m-%d %H:%M:%S'),
                data_file = stream)
            db.commit()
        os.remove(results_filepath)

        ## run fuse
        if not grep_reads:
            compute_extra(id_file, id_config, 5)
            run_fuse_for_sequence_file(id_file, id_config, id_data)
        
        ## clean
        if clean_after:
            shutil.rmtree(out_folder, ignore_errors=True)

        update_task(task_id, STATUS_COMPLETED)
    except:
        error_message = f"Error in run_vidjil : {traceback.format_exc()}\n\nSetting status to Failed."
        log.error(error_message)
        update_task(task_id, STATUS_FAILED)
        raise
    

def run_igrec(id_file, id_config, id_data, clean_before=False, clean_after=False):
    upload_folder = defs.DIR_SEQUENCES
    out_folder = defs.DIR_OUT_VIDJIL_ID % id_data

    shutil.rmtree(out_folder, ignore_errors=True)
    
    ## filepath du fichier de séquence
    row = db(db.sequence_file.id==id_file).select()
    filename = row[0].data_file
    seq_file = upload_folder+filename

    ## config de vidjil
    arg_cmd = db.config[id_config].command

    os.makedirs(out_folder)
    out_log = out_folder + '/vidjil-igrec.log'

    out_results = out_folder + "/out/igrec.vidjil"
    ## commande complete
    try:
        igrec = defs.DIR_IGREC + '/igrec.py'
        if not os.path.isfile(igrec):
            log.error("!!! IgReC binary file not found")
        cmd = "%s -s %s -o %s/out %s" % (igrec, seq_file, out_folder, arg_cmd)

        ## execute la commande IgReC
        log.info("=== Launching IgReC ===")
        log.info(cmd)
        log.info("========================")
        sys.stdout.flush()

        with open(out_log, 'w') as log_file:
            p = Popen(cmd, shell=True, stdin=PIPE, stdout=log_file, stderr=STDOUT, close_fds=True)
            p.wait()
        log.info("Output log in " + out_log)
        sys.stdout.flush()

        ## Get result file
        log.info("===>", out_results)
        results_filepath = os.path.abspath(out_results)
        if not os.path.exists(results_filepath):
            raise IOError(filename=results_filepath)
    except:
        log.error("!!! IgReC failed, no result file")
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
    with open(results_filepath, 'rb') as stream:
        ts = time.time()
        db.results_file[id_data].update_record(status = "ready",
                                        run_date = datetime.datetime.fromtimestamp(ts).strftime('%Y-%m-%d %H:%M:%S'),
                                        data_file = stream)
        db.commit()

    res = {"message": "[%s] c%s: IgReC - %s" % (id_data, id_config, out_folder)}
    log.info(res)

    run_fuse_for_sequence_file(id_file, id_config, id_data)
        
    if clean_after:
        shutil.rmtree(out_folder, ignore_errors=True)

    return "SUCCESS"

def run_mixcr(id_file, id_config, id_data, clean_before=False, clean_after=False):
    upload_folder = defs.DIR_SEQUENCES
    out_folder = defs.DIR_OUT_VIDJIL_ID % id_data

    shutil.rmtree(out_folder, ignore_errors=True)
    os.makedirs(out_folder)

    ## filepath du fichier de séquence
    row = db(db.sequence_file.id==id_file).select()
    filename = row[0].data_file
    output_filename = defs.BASENAME_OUT_VIDJIL_ID % id_data
    seq_file = upload_folder+filename

    ## config de mixcr
    arg_cmd = db.config[id_config].command

    out_log = out_folder + output_filename+'.mixcr.log'
    report = out_folder + output_filename + '.mixcr.report'

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
        log.error(arg_cmd)
        log.error("! Bad arguments, we expect args_align | args_assemble | args_exportClones")
        
    mixcr = defs.DIR_MIXCR + 'mixcr'
    cmd = mixcr + ' align --save-reads -t 1 -r ' + align_report + ' ' + args_1 + ' ' + seq_file  + ' ' + out_alignments
    cmd += ' && '
    cmd += mixcr + ' assemble -t 1 -r ' + assembly_report + ' ' + args_2 + ' ' + out_alignments + ' ' + out_clones
    cmd += ' && rm ' + out_alignments
    cmd += ' && '
    cmd += mixcr + ' exportClones --format vidjil -germline -id -name -reads -sequence -top -seg -s ' + args_3 + ' ' + out_clones + ' ' + out_results

    try:
        ## execute la commande MiXCR
        log.info("=== Launching MiXCR ===")
        log.info(cmd)
        log.info("========================")
        sys.stdout.flush()

        with open(out_log, 'w') as log_file:
            p = Popen(cmd, shell=True, stdin=PIPE, stdout=log_file, stderr=STDOUT, close_fds=True)
            p.wait()
        log.info("Output log in " + out_log)
        sys.stdout.flush()

        ## Get result file
        log.info("===>", out_results)
        results_filepath = os.path.abspath(out_results)
        if not os.path.exists(results_filepath):
            raise IOError(filename=results_filepath)
    except:
        log.error("!!! MiXCR failed, no result file")
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
    with open(results_filepath, 'w') as new_file:
        json.dump(my_json, new_file)

    ## insertion dans la base de donnée
    with open(results_filepath, 'rb') as stream:
        ts = time.time()
        db.results_file[id_data].update_record(status = "ready",
                                        run_date = datetime.datetime.fromtimestamp(ts).strftime('%Y-%m-%d %H:%M:%S'),
                                        data_file = stream)
        db.commit()
    os.remove(results_filepath)

    res = {"message": "[%s] c%s: MiXCR finished - %s" % (id_data, id_config, out_folder)}
    log.info(res)

    run_fuse_for_sequence_file(id_file, id_config, id_data)
    
    if clean_after:
        shutil.rmtree(out_folder, ignore_errors=True)

    return "SUCCESS"

def run_copy(task_id, id_file, id_config, id_data, grep_reads, clean_before=False, clean_after=False):
    update_task(task_id, STATUS_RUNNING)
    
    try:
        ## les chemins d'acces a vidjil / aux fichiers de sequences
        out_folder = defs.DIR_OUT_VIDJIL_ID % id_data
        
        shutil.rmtree(out_folder, ignore_errors=True)
        os.makedirs(out_folder)
        
        ## filepath du fichier de séquence
        row = db(db.sequence_file.id==id_file).select()
        filename = row[0].data_file
        
        ## récupération du fichier 
        results_filepath = os.path.abspath(defs.DIR_SEQUENCES+row[0].data_file)
        if not os.path.exists(results_filepath):
            log.error("!!! 'copy' failed, no file")
            res = {"message": "[%s] c%s: 'copy' FAILED - %s - %s" % (id_data, id_config, out_folder)}
            log.error(res)
            update_task(task_id, STATUS_FAILED)
            raise IOError(results_filepath)
        
        ## insertion dans la base de donnée
        with open(results_filepath, 'rb') as stream:
            ts = time.time()
            db.results_file[id_data].update_record(status = "ready",
                                            run_date = datetime.datetime.fromtimestamp(ts).strftime('%Y-%m-%d %H:%M:%S'),
                                            data_file = db.results_file.data_file.store(stream, row[0].filename))
            db.commit()
        
        if clean_after:
            shutil.rmtree(out_folder, ignore_errors=True)

        res = {"message": "[%s] c%s: 'copy' finished - %s" % (id_data, id_config, filename)}
        log.info(res)

        ## run fuse
        run_fuse_for_sequence_file(id_file, id_config, id_data)

        update_task(task_id, STATUS_COMPLETED)
        return "SUCCESS"
    except:
        error_message = f"Error in run_copy : {traceback.format_exc()}\n\nSetting status to Failed."
        log.error(error_message)
        update_task(task_id, STATUS_FAILED)
        raise


def run_refuse(args):
    for arg in args:
        run_fuse(arg[0], arg[1], arg[2], arg[3], arg[4])
    return "SUCCESS"

@scheduler.task()
def run_fuse(id_file, id_config, id_data, sample_set_id, clean_before=True, clean_after=False):
    log.debug("run_fuse Start !")
    db._adapter.reconnect()
    try:

        out_folder = defs.DIR_OUT_VIDJIL_ID % id_data
        output_filename = defs.BASENAME_OUT_VIDJIL_ID % id_data + '-%s' % sample_set_id
        
        if clean_before:
            shutil.rmtree(out_folder, ignore_errors=True)
            os.makedirs(out_folder)    
        
        ## fuse.py 
        output_file = out_folder+'/'+output_filename+'.fused'
        files = ""
        sequence_file_list = ""

        query2 = db( (db.results_file.sequence_file_id == db.sequence_file.id)
                    & (db.sample_set_membership.sequence_file_id == db.sequence_file.id)
                    & (db.sample_set_membership.sample_set_id == sample_set_id)
                    & (db.results_file.config_id == id_config)
                    & (db.results_file.hidden == False)
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
            log.error("!!! Fuse failed: no files to fuse")
            res = {"message": "[%s] c%s: 'fuse' FAILED - %s no files to fuse" % (id_data, id_config, output_file)}
            log.error(res)
            return STATUS_FAILED
        
        fuse_cmd = db.config[id_config].fuse_command
        cmd = "python "+defs.DIR_FUSE+"/fuse.py -o "+ output_file + " " + fuse_cmd + " " + files

        try:
            log.info("=== fuse.py ===")
            log.info(cmd)
            log.info("===============")
            sys.stdout.flush()

            fuse_log_file_path = out_folder+'/'+output_filename+'.fuse.log'
            with open(fuse_log_file_path, 'w') as fuse_log_file:
                p = Popen(cmd, shell=True, stdin=PIPE, stdout=fuse_log_file, stderr=STDOUT, close_fds=True)
                p.communicate()
                log.info(f"Output log in {fuse_log_file_path}")

            fuse_filepath = os.path.abspath(output_file)
            if not os.path.exists(fuse_filepath):
                raise IOError(filename=fuse_filepath)
        except:
            error_message = f"!!! Fuse failed : {traceback.format_exc()}."
            res = {"message": f"[{id_data}] c{id_config}: {output_file=} - {error_message}"}
            log.error(res)
            raise

        fused_files = db((db.fused_file.config_id == id_config) &
                        (db.fused_file.sample_set_id == sample_set_id)).select()
        if len(fused_files) > 0:
            fused_file = fused_files[0]
            id_fuse = fused_file.id
        else:
            id_fuse = db.fused_file.insert(sample_set_id = sample_set_id,
                                        config_id = id_config)
            db.commit()

        with open(fuse_filepath, 'rb') as stream:
            ts = time.time()
            db.fused_file[id_fuse].update_record(fuse_date = datetime.datetime.fromtimestamp(ts).strftime('%Y-%m-%d %H:%M:%S'),
                                                fused_file = stream,
                                                sequence_file_list = sequence_file_list)
            db.commit()
        # Remove temporary fused file
        os.remove(output_file)

        if clean_after:
            shutil.rmtree(out_folder, ignore_errors=True)
        
        res = {"message": "[%s] c%s: 'fuse' finished - %s" % (id_data, id_config, db.fused_file[id_fuse].fused_file)}
        log.info(res)

        return "SUCCESS"
    except:
        db.rollback()
        raise
    finally:
        db.close()
        log.debug("run_fuse End !")

def custom_fuse(file_list):
    
    if defs.PORT_FUSE_SERVER is None:
        raise IOError('This server cannot fuse custom data')
    random_id = random.randint(99999999,99999999999)
    out_folder = os.path.abspath(defs.DIR_OUT_VIDJIL_ID % random_id)
    output_filename = defs.BASENAME_OUT_VIDJIL_ID % random_id
    
    shutil.rmtree(out_folder, ignore_errors=True)
    os.makedirs(out_folder)    

    res = {"message": "'custom fuse' (%d files): %s" % (len(file_list), ','.join(file_list))}
    log.info(res)
        
    ## fuse.py 
    output_file = out_folder+'/'+output_filename+'.fused'
    files = ""
    for id in file_list :
        result_file = db.results_file[id]
        if result_file.data_file is not None :
            files += os.path.abspath(defs.DIR_RESULTS + result_file.data_file)
            seq_file = db.sequence_file[result_file.sequence_file_id]
            if seq_file.pre_process_file is not None:
                files += ",%s" % os.path.abspath(defs.DIR_RESULTS + seq_file.pre_process_file)
            files += " "
    
    try:
        cmd = "python "+ os.path.abspath(os.path.join(defs.DIR_FUSE, "fuse.py")) + " -o " + output_file + " -t 100 " + files
        proc_srvr = xmlrpc.client.ServerProxy("http://%s:%d" % (defs.FUSE_SERVER, defs.PORT_FUSE_SERVER))
        fuse_filepath = proc_srvr.fuse(cmd, out_folder, output_filename)
    
        with open(fuse_filepath, 'rb') as fuse_file:
            data = json.loads(fuse_file.read())
    except:
        res = {"message": "'custom fuse' -> IOError"}
        log.error(res)
        raise

    shutil.rmtree(out_folder, ignore_errors=True)

    res = {"message": "'custom fuse' -> finished"}
    log.info(res)

    return data

def schedule_pre_process(sequence_file_id, pre_process_config_id):
    args = [pre_process_config_id, sequence_file_id]

    err = assert_scheduler_task_does_not_exist(str(args))
    if err:
        log.error(err)
        return err

    task_id = register_task("pre_process", args)
    db.sequence_file[sequence_file_id].update_record(pre_process_scheduler_task_id = task_id)
    db.commit()

    update_task(task_id, STATUS_QUEUED)
    run_pre_process.delay(pre_process_config_id, sequence_file_id, task_id, clean_before=True, clean_after=False)

    res = {"redirect": "reload",
           "message": "{%s} (%s): process requested" % (sequence_file_id, pre_process_config_id)}
    log.info(res)
    return res


@scheduler.task()
def run_pre_process(pre_process_config_id, sequence_file_id, task_id, clean_before=True, clean_after=False):
    '''
    Run a pre-process on sequence_file.data_file (and possibly sequence_file.data_file+2),
    put the output back in sequence_file.data_file.
    '''
    log.debug(f"run_pre_process Start !{pre_process_config_id=} {task_id=} {sequence_file_id=}")
    db._adapter.reconnect()
    try:
        sequence_file = db.sequence_file[sequence_file_id]
        db.sequence_file[sequence_file_id].update_record(pre_process_flag = STATUS_RUNNING)
        db.commit()
       
        update_task(task_id, STATUS_RUNNING)
        

        out_folder = defs.DIR_PRE_VIDJIL_ID % sequence_file_id

        preprocess = db.pre_process[pre_process_id]
        required_files = vidjil_utils.getPreprocessRequiredFiles(preprocess)

        if required_files == 2:
            output_filename = get_preprocessed_filename(get_original_filename(sequence_file.data_file),
                                                        get_original_filename(sequence_file.data_file2))
        else:
            output_filename = get_original_filename(sequence_file.data_file)


        if clean_before:
            shutil.rmtree(out_folder, ignore_errors=True)
            os.makedirs(out_folder)    

        output_file = out_folder+'/'+output_filename
        pre_process = db.pre_process[pre_process_config_id]
        out_log = out_folder+'/'+output_filename+'.pre.log'
        
        cmd = pre_process.command.replace("&file1&", defs.DIR_SEQUENCES + sequence_file.data_file)
        if sequence_file.data_file2:
            cmd = cmd.replace("&file2&", defs.DIR_SEQUENCES + sequence_file.data_file2)
        cmd = cmd.replace("&result&", output_file)
        cmd = cmd.replace("&pear&", defs.DIR_PEAR)
        cmd = cmd.replace("&flash2&", defs.DIR_FLASH2)
        cmd = cmd.replace("&binaries&", defs.DIR_BINARIES)
        # Example of template to add some preprocess shortcut
        # cmd = cmd.replace("&preprocess_template&", defs.DIR_preprocess_template)
        # Where &preprocess_template& is the shortcut to change and
        # defs.DIR_preprocess_template the variable to set into the file defs.py. 
        # The value should be the path to access to the preprocess software.

        log.info("=== Pre-process %s ===" % pre_process_config_id)
        log.info(cmd)
        log.info("===============")
        sys.stdout.flush()

        with open(out_log, 'w') as log_file:
            completed_process = subprocess.run(cmd, shell=True, stdin=PIPE, stdout=log_file, stderr=log_file, cwd=defs.DIR_PREPROCESS)
        log.info("Output log in " + out_log)
        completed_process.check_returncode()

        filepath = os.path.abspath(output_file)
        if not os.path.exists(filepath):
            raise IOError(filename=filepath)

        # Now we update the sequence file with the result of the pre-process
        # We forget the initial data_file (and possibly data_file2)
        pre_process_filepath = '%s/pre_process.vidjil' % out_folder
        try:
            pre_process_output = open(pre_process_filepath, 'rb')
        except FileNotFoundError:
            pre_process_output = None
        with open(filepath, 'rb') as stream:
            db.sequence_file[sequence_file_id].update_record(data_file = stream,
                                                    data_file2 = None,
                                                    pre_process_flag = STATUS_COMPLETED,
                                                    pre_process_file = pre_process_output)
            db.commit()
        if pre_process_output is not None:
            pre_process_output.close()
        update_task(task_id, STATUS_COMPLETED)
        
        # resume WAITING task for this sequence file
        set_tasks_status_for_sequence_file(sequence_file_id, STATUS_QUEUED)


        # Remove data file from disk to save space (it is now saved elsewhere)
        os.remove(filepath)

        # Remove original sequence file after preprocess as no longer needed and available
        try:
            pathlib.Path(pre_process_filepath).unlink(missing_ok=True)
            pathlib.Path(defs.DIR_SEQUENCES + sequence_file.data_file).unlink(missing_ok=True)
            pathlib.Path(defs.DIR_SEQUENCES + sequence_file.data_file2).unlink(missing_ok=True)
        except Exception as exception:
            log.error(f"[pre_process_id={pre_process_config_id}] [sequence_file_id={sequence_file_id}] Removing files at the end of preprocess failed with exception {exception}.")
        
        if clean_after:
            shutil.rmtree(out_folder, ignore_errors=True)
        
        res = {"message": "{%s} p%s: 'pre_process' finished - %s" % (sequence_file_id, pre_process_config_id, output_file)}
        log.info(res)

        return "SUCCESS"
    except Exception as exception:
        log.error(f"Error in run_pre_process {pre_process_id} for sequence {sequence_file_id}: {exception}")
        log.error(traceback.format_exc())
        log.error("Setting status to Failed.")
        db.rollback()
        db._adapter.reconnect()
        try:
            db.sequence_file[sequence_file_id].update_record(pre_process_flag = STATUS_FAILED)
            db.commit()
            update_task(task_id, STATUS_FAILED)
            # cancel WAITING task for this sequence file
            set_tasks_status_for_sequence_file(sequence_file_id, STATUS_FAILED)
        except:
            db.rollback()
            raise
        raise
    finally:
        # Check status do not stay in running
        try:
            if db.scheduler_task[task_id].status == STATUS_RUNNING:
                db.sequence_file[sequence_file_id].update_record(pre_process_flag = STATUS_FAILED)
                db.commit()
                update_task(task_id, STATUS_FAILED)
                set_tasks_status_for_sequence_file(sequence_file_id, STATUS_FAILED)
        except:
            db.rollback()
            raise
        
        db.close()
        log.debug(f"run_pre_process End !{pre_process_config_id=} {task_id=} {sequence_file_id=}")
        

@scheduler.task()
def run_process(task_id, program, args):
    log.debug("run_process Start !")
    db._adapter.reconnect()
    try:
        if program == "vidjil" :
            run_vidjil(task_id, args[0],args[1],args[2],args[3])
        elif program == "none" :
            run_copy(task_id, args[0],args[1],args[2],args[3])
    except:
        db.rollback()
        try:
            update_task(task_id, STATUS_FAILED)
        except:
            raise
        raise
    finally:
        # Check status do not stay in running
        try:
            if db.scheduler_task[task_id].status == STATUS_RUNNING:
                update_task(task_id, STATUS_FAILED)
        except:
            db.rollback()
            raise
        
        db.close()
        log.debug("run_process End !")


# UTILS
def assert_scheduler_task_does_not_exist(args):
    ## check already scheduled run
    row = db( ( db.scheduler_task.args == args)
         & ( db.scheduler_task.status != STATUS_FAILED )
         & ( db.scheduler_task.status != STATUS_COMPLETED )
         ).select()

    if len(row) > 0 :
        res = {"message": "task already registered"}
        return res

    return None

def register_task(task_name, args):
    timestamp = time.time()
    task_id = db.scheduler_task.insert( task_name = task_name,
                                        args = args,
                                        status = STATUS_PENDING,
                                        start_time = datetime.datetime.fromtimestamp(timestamp).strftime('%Y-%m-%d %H:%M:%S') )
    db.commit()
    return task_id

def update_task(task_id, status):
    db.scheduler_task[task_id].update_record(status = status)
    db.commit()
    return

def compute_extra(id_file, id_config, min_threshold):
    result = {}
    data = None
    
    results_file = db((db.results_file.sequence_file_id == id_file) &
                      (db.results_file.hidden == False) &
                      (db.results_file.config_id == id_config)
                    ).select(orderby=~db.results_file.run_date).first()
    
    filename = pathlib.Path(defs.DIR_RESULTS, results_file.data_file)
    with open(filename, "rb") as file:
        try:
            data = json.load(file)
            loci_min = {}

            if 'reads' in data and 'germline' in data['reads']:
                loci_totals = data['reads']['germline']
                for locus in loci_totals:
                    if locus not in result:
                        result[locus] = [0]
                    loci_min[locus] = loci_totals[locus][0] * (min_threshold/100.0)

            if 'clones' in data and data['clones'] is not None:
                for clone in data["clones"]:
                    germline = clone['germline']
                    if clone['reads'][0] >=  loci_min[germline]:
                        result[germline][0] += 1
            elif data["clones"] is None:
                # Be robust against 'null' values for clones
                data["clones"] = []
            
        except ValueError as exception:
            log.error(f"invalid_json: {exception}")
            return "FAIL"
    
    data['reads']['distribution'] = result
    with open(filename, 'w') as extra_file:
        json.dump(data, extra_file)
    return "SUCCESS"
    
def run_fuse_for_sequence_file(sequence_file_id : int, config_id: int, data_id: int) -> None:
    for row in db(db.sample_set_membership.sequence_file_id==sequence_file_id).select() :
        sample_set_id = row.sample_set_id
        log.info(f"Run fuse for sample {sample_set_id}")
        run_fuse.delay(sequence_file_id, config_id, data_id, sample_set_id, clean_before = False)

def set_tasks_status_for_sequence_file(sequence_file_id: int, status: str):
    waiting_tasks = db((db.results_file.sequence_file_id == sequence_file_id) & 
                       (db.results_file.scheduler_task_id == db.scheduler_task.id) & 
                       (db.scheduler_task.status == STATUS_WAITING)).select()
    for row in waiting_tasks :
        update_task(row.scheduler_task.id, status)

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
    match = READS_MATCHER_REGEX.search(report).group()
    return match.split(' ')[-1]

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
