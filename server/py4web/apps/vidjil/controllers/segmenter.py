# -*- coding: utf-8 -*-
from sys import modules
from .. import defs
from ..modules.stats_decorator import *
from ..modules import vidjil_utils
from ..VidjilAuth import VidjilAuth
from io import StringIO
import json
import os
from py4web import action, request, abort, redirect, URL, Field, HTTP, response
from collections import defaultdict
from contextlib import contextmanager
import tempfile
import shutil

from ..common import cors, log


##################################
# HELPERS
##################################

ACCESS_DENIED = "access denied"

@contextmanager
def TemporaryDirectory():
    name = tempfile.mkdtemp()
    try:
        yield name
    finally:
        shutil.rmtree(name)

        
limit_max = 10 #max sequence per request
        

def segment_sequences(sequences):
    '''
    Segment the sequences given in parameter (FASTA format)
    and return a JSON of the result
    '''
    text_result = "{}"
    
    check = check_sequences(sequences)
    if check != None:
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
            config = '-c designations -3 -g germline'
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
                res = {"success": "false", "message": "Error while processing the file"}
                log.error(res)
                return json.dumps(res, separators=(',', ':'))

    log.debug("segment sequences %s" % str(sequences))
    return text_result

def check_sequences(sequences):
    #fasta format ?
    if sequences[0] == '>':
        if len(sequences.split('>')) > limit_max+1 :
            return "too many sequences (limit : " + str(limit_max) + ")"

    #fastq format ?
    elif sequences[0] == '@':
        if len(sequences.split('\n')) > 4*(limit_max+1) :
            return "too many sequences (limit : " + str(limit_max) + ")"

    #unknow format ?
    else :
        return "invalid sequences, please use fasta or fastq format"
    return None


##################################
# CONTROLLERS
##################################

@action("/vidjil/segmenter/index", method=["POST", "GET"])
@action.uses(cors)
@vidjil_utils.jsontransformer
def index():
    if "sequences" not in request.params or request.params['sequences'] == '':
        log.error("no sequences in segmenter request")
        return None

    sequences = request.params['sequences']
    return segment_sequences(sequences)
