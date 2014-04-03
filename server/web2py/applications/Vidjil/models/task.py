# coding: utf8

def run_vidjil(id_file, id_config):
    from subprocess import Popen, PIPE, STDOUT, os
    
    ## les chemins d'acces a vidjil / aux fichiers de sequences
    vidjil_path = '/home/duez/bonsai/vdj/vidjil'
    upload_folder = 'VIDJIL_PATH/interface/web2py/applications/Vidjil_test/uploads/'
    
    ## filepath du fichier de séquence
    row = db(db.sequence_file.id==id_file).select()
    filename = row[0].data_file
    seq_file = upload_folder+filename
    
    ## config de vidjil
    row2 = db(db.config.id==id_config).select()
    vidjil_cmd = row2[0].command
    
    ## commande complete
    cmd = 'VIDJIL_PATH/vidjil ' + vidjil_cmd + ' ' + seq_file
    cmd = cmd.replace('VIDJIL_PATH' , vidjil_path)
    
    ## execute la commande vidjil
    p = Popen(cmd, shell=True, stdin=PIPE, stdout=PIPE, stderr=STDOUT, close_fds=True)
    output = p.stdout.read()
    
    ## récupération du fichier data.json généré
    data_filepath = os.path.abspath("/home/duez/bonsai/vdj/vidjil/out/data.json")
    stream = open(data_filepath, 'rb')
    
    ## insertion dans la base de donnée
    id = db.data_file.insert(sequence_file_id=id_file,
                config_id=id_config,
                data_file=stream
                )
    
    db.commit()
    
    ## l'output de Vidjil est stocké comme resultat pour l'ordonnanceur
    ## TODO parse result success/fail
    return output


from gluon.scheduler import Scheduler
scheduler = Scheduler(db, dict(run=run_vidjil))
