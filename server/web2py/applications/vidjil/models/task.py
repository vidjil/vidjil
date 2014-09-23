# coding: utf8
def schedule_run(id_sequence, id_config):
    import time, datetime, sys, os.path
    from subprocess import Popen, PIPE, STDOUT, os

    id_patient = db.sequence_file[id_sequence].patient_id
        
    #check results_file
    row = db( ( db.results_file.config_id == id_config ) & 
             ( db.results_file.sequence_file_id == id_sequence )  
             ).select()
    
    if len(row) > 0 : ## update
        data_id = row[0].id
    else:             ## create
        data_id = db.results_file.insert(sequence_file_id = id_sequence,
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


    ##add task to scheduler
    task = scheduler.queue_task('run', [id_sequence, id_config, data_id, fuse_id]
                         , repeats = 1, timeout = 6000)
    db.results_file[data_id] = dict(scheduler_task_id = task.id)

    filename= db.sequence_file[id_sequence].filename
    config_name = db.config[id_config].name
    patient_name = db.patient[id_patient].first_name + " " + db.patient[id_patient].last_name

    res = {"redirect": "reload",
           "message": "default/run_request : request added to run config " + config_name + " on " + filename + " for " + patient_name }

    return res


def run_vidjil(id_file, id_config, id_data, id_fuse):
    import time, datetime, sys, os.path
    from subprocess import Popen, PIPE, STDOUT, os
    
    ## les chemins d'acces a vidjil / aux fichiers de sequences
    vidjil_path = os.path.abspath(os.path.dirname(sys.argv[0])) + '/../..'
    germline_folder = vidjil_path + '/germline/'
    upload_folder = os.path.abspath(os.path.dirname(sys.argv[0])) + '/applications/vidjil/uploads/'
    out_folder = os.path.abspath(os.path.dirname(sys.argv[0])) + '/out_'+str(id_data)+'/'
    
    cmd = "rm -rf "+out_folder 
    p = Popen(cmd, shell=True, stdin=PIPE, stdout=PIPE, stderr=STDOUT, close_fds=True)
    p.wait()
    
    ## filepath du fichier de séquence
    row = db(db.sequence_file.id==id_file).select()
    filename = row[0].data_file
    seq_file = upload_folder+filename
    id_patient = row[0].patient_id

    ## config de vidjil
    vidjil_cmd = db.config[id_config].command
    vidjil_germline = db.config[id_config].germline
    
    ## commande complete
    cmd = vidjil_path+'/vidjil ' + vidjil_cmd + ' -o  ' + out_folder + ' -G ' + germline_folder + vidjil_germline + ' '+ seq_file
    
    ## execute la commande vidjil
    p = Popen(cmd, shell=True, stdin=PIPE, stdout=PIPE, stderr=STDOUT, close_fds=True)
    p.wait()
    print p.stdout.read()
    
    ## récupération du fichier data.json généré
    results_filepath = os.path.abspath(out_folder+"vidjil.data")
    stream = open(results_filepath, 'rb')
    
    ## insertion dans la base de donnée
    ts = time.time()
    
    db.results_file[id_data] = dict(status = "ready",
                                 run_date = datetime.datetime.fromtimestamp(ts).strftime('%Y-%m-%d %H:%M:%S'),
                                 data_file = stream
                                )
    
    db.commit()
    
    ## relance fuse.py 
    output_file = out_folder+"result"
    files = ""
    query = db( ( db.patient.id == db.sequence_file.patient_id )
                   & ( db.results_file.sequence_file_id == db.sequence_file.id )
                   & ( db.patient.id == id_patient )
                   & ( db.results_file.config_id == id_config )
                   ).select( orderby=db.sequence_file.sampling_date ) 
    for row in query :
        if row.results_file.data_file is not None :
            files += os.path.abspath(os.path.dirname(sys.argv[0])) + "/applications/vidjil/uploads/"+row.results_file.data_file+" "
    
    cmd = "python ../fuse.py -o "+output_file+" -t 100 -g "+vidjil_germline+" "+files
    
    p = Popen(cmd, shell=True, stdin=PIPE, stdout=PIPE, stderr=STDOUT, close_fds=True)
    p.wait()

    fuse_filepath = os.path.abspath(output_file)
    stream = open(fuse_filepath, 'rb')
    
    ts = time.time()
    
    db.fused_file[id_fuse] = dict(fuse_date = datetime.datetime.fromtimestamp(ts).strftime('%Y-%m-%d %H:%M:%S'),
                                 fused_file = stream)
    
    db.commit()
    
    clean_cmd = "rm -rf " + out_folder 
    p = Popen(clean_cmd, shell=True, stdin=PIPE, stdout=PIPE, stderr=STDOUT, close_fds=True)
    p.wait()
    
    ## l'output de Vidjil est stocké comme resultat pour l'ordonnanceur
    ## TODO parse result success/fail
    return "sucess"


from gluon.scheduler import Scheduler
scheduler = Scheduler(db, dict(run=run_vidjil))
