# coding: utf8
import os
import sys
import defs

TASK_TIMEOUT = 10 * 60

def schedule_run(id_sequence, id_config):
    import time, datetime, sys, os.path
    from subprocess import Popen, PIPE, STDOUT, os

    id_patient = db.sequence_file[id_sequence].patient_id
        
    #check results_file
    row = db( ( db.results_file.config_id == id_config ) & 
             ( db.results_file.sequence_file_id == id_sequence )  
             ).select()
    
    ts = time.time()
    data_id = db.results_file.insert(sequence_file_id = id_sequence,
                                     run_date = datetime.datetime.fromtimestamp(ts).strftime('%Y-%m-%d %H:%M:%S'),
                                     config_id = id_config )
        
    ## check fused_file
    row2 = db( ( db.fused_file.config_id == id_config ) & 
              ( db.fused_file.patient_id == id_patient )  
            ).select()

    if len(row2) > 0 : ## update
        fuse_id = row2[0].id
    else:             ## create
        fuse_id = db.fused_file.insert(patient_id = id_patient,
                                        config_id = id_config)
        
    ##check scheduled run
    row3 = db( ( db.scheduler_task.args == '["' + id_sequence + '", "' + id_config + '", ' + str(data_id) + ', ' + str(fuse_id) + ']' ) 
         & ( db.scheduler_task.status != "FAILED"  )
         & ( db.scheduler_task.status != "EXPIRED"  )
         & ( db.scheduler_task.status != "TIMEOUT"  )
         & ( db.scheduler_task.status != "COMPLETED"  )
         ).select()

    if len(row3) > 0 :
        res = {"message": "run already registered"}
        return res


    program = db.config[id_config].program
    ##add task to scheduler
    task = scheduler.queue_task(program, [id_sequence, id_config, data_id, fuse_id]
                                , repeats = 1, timeout = TASK_TIMEOUT)
    db.results_file[data_id] = dict(scheduler_task_id = task.id)

    filename= db.sequence_file[id_sequence].filename
    config_name = db.config[id_config].name
    patient_name = db.patient[id_patient].first_name + " " + db.patient[id_patient].last_name

    res = {"redirect": "reload",
           "message": "%s (%s) %s: process requested" % (patient_name, config_name, filename)}

    log.info(res)
    return res


def run_vidjil(id_file, id_config, id_data, id_fuse, clean_before=False, clean_after=False):
    import time, datetime, sys, os.path
    from subprocess import Popen, PIPE, STDOUT, os
    
    ## les chemins d'acces a vidjil / aux fichiers de sequences
    germline_folder = defs.DIR_VIDJIL + '/germline/'
    upload_folder = defs.DIR_SEQUENCES
    out_folder = defs.DIR_OUT_VIDJIL_ID % id_data
    
    cmd = "rm -rf "+out_folder 
    p = Popen(cmd, shell=True, stdin=PIPE, stdout=PIPE, stderr=STDOUT, close_fds=True)
    p.wait()
    
    ## filepath du fichier de séquence
    row = db(db.sequence_file.id==id_file).select()
    filename = row[0].data_file
    output_filename = "%06d" % id_data
    seq_file = upload_folder+filename

    ## config de vidjil
    vidjil_cmd = db.config[id_config].command
    vidjil_germline = db.config[id_config].germline
    
    os.makedirs(out_folder)
    vidjil_log_file = open(out_folder+'/'+output_filename+'.vidjil.log', 'w')

    ## commande complete
    cmd = defs.DIR_VIDJIL + '/vidjil ' + ' -o  ' + out_folder + " -b " + output_filename
    if not vidjil_germline == 'multi':
        cmd += ' -G ' + germline_folder + vidjil_germline 
    cmd += ' ' + vidjil_cmd + ' '+ seq_file
    
    ## execute la commande vidjil
    print "=== Launching Vidjil ==="
    print cmd    
    print "========================"
    sys.stdout.flush()

    p = Popen(cmd, shell=True, stdin=PIPE, stdout=vidjil_log_file, stderr=STDOUT, close_fds=True)

    (stdoutdata, stderrdata) = p.communicate()

    print "Output log in "+out_folder+'/'+output_filename+'.vidjil.log'
    sys.stdout.flush()
    db.commit()

    ## récupération du fichier data.json généré
    results_filepath = os.path.abspath(out_folder+'/'+output_filename+".vidjil")

    try:
        stream = open(results_filepath, 'rb')
    except IOError:
        print "!!! Vidjil failed, no .vidjil file"
        raise IOError
    
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

    run_fuse(id_file, id_config, id_data, id_fuse, clean_before = False)

    return "SUCCESS"



def run_copy(id_file, id_config, id_data, id_fuse, clean_before=False, clean_after=False):
    import time, datetime, sys, os.path
    from subprocess import Popen, PIPE, STDOUT, os
    
    ## les chemins d'acces a vidjil / aux fichiers de sequences
    upload_folder = defs.DIR_SEQUENCES
    output_filename = "%06d" % id_data
    out_folder = defs.DIR_OUT_VIDJIL_ID % id_data
    
    cmd = "rm -rf "+out_folder 
    p = Popen(cmd, shell=True, stdin=PIPE, stdout=PIPE, stderr=STDOUT, close_fds=True)
    p.wait()
    
    ## filepath du fichier de séquence
    row = db(db.sequence_file.id==id_file).select()
    filename = row[0].data_file
    
    os.makedirs(out_folder)
    vidjil_log_file = open(out_folder+'/'+output_filename+'.vidjil.log', 'w')

    print "Output log in "+out_folder+'/'+output_filename+'.vidjil.log'
    sys.stdout.flush()
    db.commit()
    
    ## récupération du fichier 
    results_filepath = os.path.abspath(defs.DIR_SEQUENCES+row[0].data_file)

    try:
        stream = open(results_filepath, 'rb')
    except IOError:
        print "!!! Vidjil failed, no .vidjil file"
        raise IOError
    
    ## insertion dans la base de donnée
    ts = time.time()
    
    db.results_file[id_data] = dict(status = "ready",
                                 run_date = datetime.datetime.fromtimestamp(ts).strftime('%Y-%m-%d %H:%M:%S'),
                                 #data_file = row[0].data_file
                                 data_file = stream
                                )
    db.commit()
    
    if clean_after:
        clean_cmd = "rm -rf " + out_folder 
        p = Popen(clean_cmd, shell=True, stdin=PIPE, stdout=PIPE, stderr=STDOUT, close_fds=True)
        p.wait()
    
    ## l'output de Vidjil est stocké comme resultat pour l'ordonnanceur
    ## TODO parse result success/fail

    run_fuse(id_file, id_config, id_data, id_fuse, clean_before = False)

    return "SUCCESS"



def run_fuse(id_file, id_config, id_data, id_fuse, clean_before=True, clean_after=False):
    import time, datetime, sys, os.path
    from subprocess import Popen, PIPE, STDOUT, os
    
    out_folder = defs.DIR_OUT_VIDJIL_ID % id_data
    output_filename = "%06d" % id_data
    
    if clean_before:
        cmd = "rm -rf "+out_folder 
        p = Popen(cmd, shell=True, stdin=PIPE, stdout=PIPE, stderr=STDOUT, close_fds=True)
        p.wait()
        os.makedirs(out_folder)    
    
    row = db(db.sequence_file.id==id_file).select()
    id_patient = row[0].patient_id
    
    fuse_log_file = open(out_folder+'/'+output_filename+'.fuse.log', 'w')
    
    ## fuse.py 
    output_file = out_folder+'/'+output_filename+'.fused'
    files = ""
    query = db( ( db.patient.id == db.sequence_file.patient_id )
                   & ( db.results_file.sequence_file_id == db.sequence_file.id )
                   & ( db.patient.id == id_patient )
                   & ( db.results_file.config_id == id_config )
                   ).select( orderby=db.sequence_file.id|db.results_file.run_date, groupby=db.sequence_file.id ) 
    for row in query :
        if row.results_file.data_file is not None :
            files += defs.DIR_RESULTS + row.results_file.data_file + " "
    
    cmd = "python "+defs.DIR_FUSE+"/fuse.py -o "+output_file+" -t 100 "+files


    print "=== fuse.py ==="
    print cmd
    print "==============="
    sys.stdout.flush()

    p = Popen(cmd, shell=True, stdin=PIPE, stdout=fuse_log_file, stderr=STDOUT, close_fds=True)
    (stdoutdata, stderrdata) = p.communicate()
    print "Output log in "+out_folder+'/'+output_filename+'.fuse.log'

    fuse_filepath = os.path.abspath(output_file)

    try:
        stream = open(fuse_filepath, 'rb')
    except IOError:
        print "!!! Fuse failed, no .fused file"
        raise IOError

    ts = time.time()
    db.fused_file[id_fuse] = dict(fuse_date = datetime.datetime.fromtimestamp(ts).strftime('%Y-%m-%d %H:%M:%S'),
                                 fused_file = stream)
    db.commit()

    if clean_after:
        clean_cmd = "rm -rf " + out_folder 
        p = Popen(clean_cmd, shell=True, stdin=PIPE, stdout=PIPE, stderr=STDOUT, close_fds=True)
        p.wait()
    
    return "SUCCESS"


from gluon.scheduler import Scheduler
scheduler = Scheduler(db, dict(vidjil=run_vidjil,
                               none=run_copy))
