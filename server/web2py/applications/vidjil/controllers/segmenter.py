# -*- coding: utf-8 -*-
from contextlib import contextmanager
import tempfile
import shutil
import defs
import gluon

if request.env.http_origin:
    response.headers['Access-Control-Allow-Origin'] = request.env.http_origin
    response.headers['Access-Control-Allow-Credentials'] = 'true'
    response.headers['Access-Control-Max-Age'] = 86400

@contextmanager
def TemporaryDirectory():
    name = tempfile.mkdtemp()
    try:
        yield name
    finally:
        shutil.rmtree(name)

        
limit_max = 10 #max sequence per request
        

def index():
    if request.vars['sequences'] == None or request.vars['sequences'] == '':
        return None

    sequences = request.vars['sequences']
    return segment_sequences(sequences)

def segment_sequences(sequences):
    '''
    Segment the sequences given in parameter (FASTA format)
    and return a JSON of the result
    '''
    text_result = "{}"
    
    check = check_sequences(sequences)
    if check is not None:
        text_result = '{"error": "%s"}' % check
    else:
        with TemporaryDirectory() as folder_path:
            
            #store sequences in a tmp file
            file_path = folder_path + "/sequences.txt"
            fasta = open(file_path, 'w')
            fasta.write(sequences)
            fasta.close()
            
            #store result in a tmp file
            result_path = folder_path + "/sequences.vidjil"
            
            ## les chemins d'acces a vidjil / aux fichiers de sequences
            germline_folder = defs.DIR_VIDJIL + '/germline/'

            ## config de vidjil
            config = '-c designations -2 -3 -g germline'
            config = config.replace( ' germline' ,germline_folder)

            ## commande complete
            cmd = defs.DIR_VIDJIL + '/vidjil-algo ' + ' -o  ' + folder_path 
            cmd += ' ' + config + ' ' + file_path

            ## execute la commande vidjil
            os.system(cmd)

            if os.path.isfile(result_path):
                with open(result_path, 'r') as myfile:
                    text_result = myfile.read()
            else:
                return response.json({'error': 'Error while processing the file'})

    log.debug("segment sequences %s" % str(sequences))
    return response.json(gluon.contrib.simplejson.loads(text_result))

def check_sequences(sequences):
    #fasta format ?
    if sequences[0] is '>':
        if len(sequences.split('>')) > limit_max+1 :
            return "too many sequences (limit : " + str(limit_max) + ")"

    #fastq format ?
    elif sequences[0] is '@':
        if len(sequences.split('\n')) > 4*(limit_max+1) :
            return "too many sequences (limit : " + str(limit_max) + ")"

    #unknow format ?
    else :
        return "invalid sequences, please use fasta or fastq format"
    return None
