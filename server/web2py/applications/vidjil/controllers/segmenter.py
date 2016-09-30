# -*- coding: utf-8 -*-
from contextlib import contextmanager
import tempfile
import shutil
import defs
from subprocess import Popen, PIPE, STDOUT, os

@contextmanager
def TemporaryDirectory():
    name = tempfile.mkdtemp()
    try:
        yield name
    finally:
        shutil.rmtree(name)

        
limit_max = 10 #max sequence per request
        

def index():
    form = SQLFORM.factory(
        Field('sequences', 'text'),
        Field('file', 'upload', uploadfolder=os.path.join(request.folder,'uploads')))
    form.element('textarea[name=sequences]')['_style'] = 'width:800px; height:200px;'
    
    text_result = ""
    
    if form.process(onvalidation=checkform_segmenter).accepted:
        with TemporaryDirectory() as folder_path:
            
            #store sequences in a tmp file
            file_path = folder_path + "/sequences.txt"
            file = open(file_path, 'w')
            file.write(form.vars.sequences)
            file.close()
            
            #store result in a tmp file
            result_path = folder_path + "/result.txt"
            result = open(result_path, 'w')
            
            ## les chemins d'acces a vidjil / aux fichiers de sequences
            germline_folder = defs.DIR_VIDJIL + '/germline/'

            ## config de vidjil
            config = '-c segment -i -2 -3 -g germline'
            config = config.replace( ' germline' ,germline_folder)

            ## commande complete
            cmd = defs.DIR_VIDJIL + '/vidjil ' + ' -o  ' + folder_path 
            cmd += ' ' + config + ' ' + file_path

            ## execute la commande vidjil
            sys.stdout.flush()
            p = Popen(cmd, shell=True, stdin=PIPE, stdout=result, stderr=STDOUT, close_fds=True)
            p.wait()
            result.close()
            
            with open(result_path, 'r') as myfile:
                text_result = myfile.read()
        response.flash = file_path
        
    elif form.errors:
        response.flash = 'form has errors'
        
    #form.errors.sequences = form.vars.sequences
    return dict(form=form,
                result=text_result)






def checkform_segmenter(form):
    
    #copy file content into form.vars.sequences
    if  hasattr(form.vars.file, 'file') :
        with TemporaryDirectory() as folder_path:
            file=request.vars.file.file 
            shutil.copyfileobj(file,open(folder_path+"/sequences.txt",'wb')) 
            with open(folder_path+"/sequences.txt", 'r') as myfile:
                form.vars.sequences = myfile.read()
        form.vars.sequences+= "\n"
    
    
    #fasta format ?
    if form.vars.sequences[0] is '>':
        if len(form.vars.sequences.split('>')) > limit_max+1 :
            form.errors.sequences = "too much sequences (limit : " + str(limit_max) + ")"
            
    #fastq format ?
    elif form.vars.sequences[0] is '@':
        if len(form.vars.sequences.split('\n')) > 4*(limit_max+1) :
            form.errors.sequences = "too much sequences (limit : " + str(limit_max) + ")"
    
    #unknow format ?
    else :
        form.errors.sequences = "invalid sequences, please use fasta or fastq format"
