# coding: utf8

def run_vidjil(id_file, id_config, id_data, id_fuse):
    import time, datetime, sys, os.path
    from subprocess import Popen, PIPE, STDOUT, os
    
    ## les chemins d'acces a vidjil / aux fichiers de sequences
    vidjil_path = sys.path[0] + '../..'
    germline_folder = vidjil_path + '/germline/'
    upload_folder = sys.path[0] + 'applications/vidjil/uploads/'
    out_folder = vidjil_path + '/out'+id_config+'_'+id_data+'/'
    
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
    output = p.stdout.read()

    ## récupération du fichier data.json généré
    data_filepath = os.path.abspath(out_folder+"vidjil.data")
    stream = open(data_filepath, 'rb')
    
    ## insertion dans la base de donnée
    ts = time.time()
    
    db.data_file[id_data] = dict(status = 'ready',
                                 run_date = datetime.datetime.fromtimestamp(ts).strftime('%Y-%m-%d'),
                                 data_file = stream
                                )
    
    db.commit()
    
    ## relance fuse.py 
    output_file = out_folder+"result"
    files = ""
    query = db( ( db.patient.id == db.sequence_file.patient_id )
                   & ( db.data_file.sequence_file_id == db.sequence_file.id )
                   & ( db.patient.id == id_patient )
                   & ( db.data_file.config_id == id_config )
                   ).select( orderby=db.sequence_file.sampling_date ) 
    for row in query :
        files += sys.path[0] + "applications/vidjil/uploads/"+row.data_file.data_file
    
    cmd = "python ../fuse.py -o "+output_file+" -t 100 -g "+vidjil_germline+" "+files
    
    p = Popen(cmd, shell=True, stdin=PIPE, stdout=PIPE, stderr=STDOUT, close_fds=True)
    p.wait()
    
    fuse_filepath = os.path.abspath(output_file)
    stream = open(fuse_filepath, 'rb')
    
    db.fused_file[id_fuse] = dict(fuse_date = datetime.datetime.fromtimestamp(ts).strftime('%Y-%m-%d'),
                                 fused_file = stream)
    
    db.commit()
    
    clean_cmd = "rm -rf " + out_folder 
    p = Popen(clean_cmd, shell=True, stdin=PIPE, stdout=PIPE, stderr=STDOUT, close_fds=True)
    p.wait()
    
    ## l'output de Vidjil est stocké comme resultat pour l'ordonnanceur
    ## TODO parse result success/fail
    return cmd


from gluon.scheduler import Scheduler
scheduler = Scheduler(db, dict(run=run_vidjil))
