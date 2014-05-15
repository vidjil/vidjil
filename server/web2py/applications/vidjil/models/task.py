# coding: utf8

def run_vidjil(id_file, id_config, id_data):
    import time, datetime
    from subprocess import Popen, PIPE, STDOUT, os
    
    ## les chemins d'acces a vidjil / aux fichiers de sequences
    vidjil_path = '/home/duez/git/vidjil'
    germline_folder = vidjil_path + '/germline/'
    upload_folder = vidjil_path + '/server/web2py/applications/vidjil/uploads/'
    out_folder = vidjil_path + '/out/'
    
    ## filepath du fichier de séquence
    row = db(db.sequence_file.id==id_file).select()
    filename = row[0].data_file
    seq_file = upload_folder+filename
    
    ## config de vidjil
    vidjil_cmd = db.config[id_config].command
    vidjil_germline = db.config[id_config].germline
    
    ## commande complete
    cmd = vidjil_path+'/vidjil ' + vidjil_cmd + ' -o  ' + out_folder + ' -G ' + germline_folder + vidjil_germline + ' '+ seq_file
    
    ## execute la commande vidjil
    p = Popen(cmd, shell=True, stdin=PIPE, stdout=PIPE, stderr=STDOUT, close_fds=True)
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
    
    ## l'output de Vidjil est stocké comme resultat pour l'ordonnanceur
    ## TODO parse result success/fail
    return cmd


from gluon.scheduler import Scheduler
scheduler = Scheduler(db, dict(run=run_vidjil))
