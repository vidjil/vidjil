# coding: utf8
import gluon.contrib.simplejson
import defs
import vidjil_utils
import os
import controller_utils
if request.env.http_origin:
    response.headers['Access-Control-Allow-Origin'] = request.env.http_origin  
    response.headers['Access-Control-Allow-Credentials'] = 'true'
    response.headers['Access-Control-Max-Age'] = 86400


def add(): 
    if not auth.can_modify_patient(request.vars['id'], auth.user_id):
        return error_message("you need admin permission on this patient to add files")
    elif not auth.can_upload_file(request.vars['id']):
        return error_message("you don't have right to upload files")
    else:
        query = db((db.sequence_file.patient_id==request.vars['id'])).select()
        if len(query) != 0 :
            pcr = query[0].pcr
            sequencer = query[0].sequencer
            producer = query[0].producer
        else:
            pcr = sequencer = producer = ""
        return dict(message=T('add file'),
                    pcr=pcr,
                    sequencer=sequencer,
                    producer=producer)

#TODO check data
def add_form(): 
    import shutil, os.path, datetime
    error = ""
    
    if request.vars['sampling_date'] != '' :
        try:
            datetime.datetime.strptime(""+request.vars['sampling_date'], '%Y-%m-%d')
        except ValueError:
            error += "date (wrong format), "
    if request.vars['filename'] == None :
        error += " missing filename"
            
    if error=="" :
        query = db((db.sequence_file.patient_id==request.vars['patient_id'])).select()
        for row in query :
            if row.filename == request.vars['filename'] :
                return error_message("this sequence file already exists for this patient")
            
        id = db.sequence_file.insert(sampling_date=request.vars['sampling_date'],
                            info=request.vars['file_info'],
                            pcr=request.vars['pcr'],
                            sequencer=request.vars['sequencer'],
                            producer=request.vars['producer'],
                            patient_id=request.vars['patient_id'],
                            filename=request.vars['filename'],
                            provider=auth.user_id)
    
        res = {"file_id" : id,
               "message": "file %s (%s): upload started: %s" % (id, request.vars['patient_id'], request.vars['filename']),
               "redirect": "patient/info",
               "args" : {"id" : request.vars['patient_id']}
               }
        log.info(res)

        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
        
    else :
        return error_message(error)


def edit(): 
    if auth.can_modify_patient(request.vars['patient_id']):
        return dict(message=T('edit file'))
    #elif not auth.can_upload_file(request.vars['id']):
    #    res = {"success" : "false", "message" : "you don't have right to upload files"}
    #    return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
    else:
        return error_message("you need admin permission to edit files")
        


#TODO check data
def edit_form(): 
    import shutil, os.path, datetime
    error = ""
    
    if request.vars['id'] == None :
        error += "missing id"
    if request.vars['filename'] == None :
        error += " missing filename"
    if request.vars['sampling_date'] != '' :
        try:
            datetime.datetime.strptime(""+request.vars['sampling_date'], '%Y-%m-%d')
        except ValueError:
            error += "date (wrong format), "
            
    if error=="" :
        mes = "file " + str(request.vars['id']) + " : "
        filename = db.sequence_file[request.vars['id']].filename
        if request.vars['filename'] != "":
            filename = request.vars['filename']
        if request.vars['sampling_date'] != None and request.vars['file_info'] != None :
            db.sequence_file[request.vars["id"]] = dict(sampling_date=request.vars['sampling_date'],
                                                        info=request.vars['file_info'],
                                                        pcr=request.vars['pcr'],
                                                        sequencer=request.vars['sequencer'],
                                                        producer=request.vars['producer'],
                                                        filename=filename,
                                                        provider=auth.user_id)
            
        patient_id = db.sequence_file[request.vars["id"]].patient_id
        
        res = {"file_id" : request.vars['id'],
               "redirect": "patient/info",
               "args" : { "id" : patient_id},
               "message": "file %s: metadata saved" % request.vars["id"]}
        log.info(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))

def upload(): 
    session.forget(response)
    error = ""
    if request.vars['id'] == None :
        error += "missing id"
    
    if error=="" :

        patient_id = db.sequence_file[request.vars["id"]].patient_id            
        mes = "file %s (%s): " % (request.vars['id'], patient_id)
        res = {"message": mes + "processing uploaded file",
               "redirect": "patient/info",
               "args" : {"id" : request.vars['id']}
               }
        log.debug(res)
        if request.vars.file != None :
            f = request.vars.file
            db.sequence_file[request.vars["id"]] = dict(data_file = db.sequence_file.data_file.store(f.file, f.filename))
            mes += "upload finished"
        
        seq_file = defs.DIR_SEQUENCES+db.sequence_file[request.vars["id"]].data_file
        size = os.path.getsize(seq_file)
        mes += ' (%s)' % vidjil_utils.format_size(size)
        db.sequence_file[request.vars["id"]] = dict(size_file = size)
        
        res = {"message": mes}
        log.info(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
  

def confirm():
    if auth.can_modify_patient(request.vars['patient_id']):
        return dict(message=T('confirm sequence file deletion'))
    else:
        return error_message("you need admin permission to delete this file")

def delete_sequence_file(seq_id):
    sequence = db.sequence_file[seq_id]
    seq_filename = sequence.data_file
    if auth.can_modify_patient(sequence.patient_id):
        log.debug('Deleting '+defs.DIR_SEQUENCES+seq_filename+' with ID'+str(seq_id))
        db.sequence_file[seq_id] = dict(data_file = None)
    else:
        return error_message('you need admin permission to delete this file')

def delete():
    import shutil, os.path
    
    patient_id = db.sequence_file[request.vars["id"]].patient_id
    
    if auth.can_modify_patient(patient_id):
        db(db.sequence_file.id == request.vars["id"]).delete()
        db(db.results_file.sequence_file_id == request.vars["id"]).delete()

        res = {"redirect": "patient/info",
               "args" : { "id" : patient_id},
               "message": "file %s (%s): sequence file deleted" % (request.vars["id"], patient_id)}
        log.info(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
    else:
        return error_message("you need admin permission to delete this file")

def sequencer_list():
    sequencer_list = []
    for row in db(db.sequence_file.sequencer != None).select(db.sequence_file.sequencer, distinct=True):
        if row.sequencer is not "null" :
            sequencer_list.append(row.sequencer)
            
    res = {"sequencer": sequencer_list}
    return gluon.contrib.simplejson.dumps(res, separators=(',',':'))

def pcr_list():
    pcr_list = []
    for row in db(db.sequence_file.pcr != None).select(db.sequence_file.pcr, distinct=True):
        if row.pcr is not "null" :
            pcr_list.append(row.pcr)
            
    res = {"pcr": pcr_list}
    return gluon.contrib.simplejson.dumps(res, separators=(',',':'))

def producer_list():
    producer_list = []
    for row in db(db.sequence_file.producer != None).select(db.sequence_file.producer, distinct=True):
        if row.producer is not "null" :
            producer_list.append(row.producer)
            
    res = {"producer": producer_list}
    return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
