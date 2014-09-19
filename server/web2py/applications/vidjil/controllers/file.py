# coding: utf8
import gluon.contrib.simplejson
if request.env.http_origin:
    response.headers['Access-Control-Allow-Origin'] = request.env.http_origin  
    response.headers['Access-Control-Allow-Credentials'] = 'true'
    response.headers['Access-Control-Max-Age'] = 86400


def add(): 
    if not auth.has_permission('admin', 'patient', request.vars['id'], auth.user_id):
        res = {"success" : "false", "message" : "you need admin permission on this patient to add files"}
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
    elif not auth.has_permission('upload', 'sequence_file', request.vars['id'], auth.user_id):
        res = {"success" : "false", "message" : "you don't have right to upload files"}
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
    else:
        return dict(message=T('add file'))

#TODO check data
def add_form(): 
    import shutil, os.path, datetime
    error = ""
    
    if request.vars['sampling_date'] != None :
        try:
            datetime.datetime.strptime(""+request.vars['sampling_date'], '%Y-%m-%d')
        except ValueError:
            error += "date missing or wrong format, "
    if request.vars['filename'] == None :
        error += " missing filename"
            
    if error=="" :
        query = db((db.sequence_file.patient_id==request.vars['patient_id'])).select()
        for row in query :
            if row.filename == request.vars['filename'] :
                res = {"message": "this sequence file already exists for this patient"}
                return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
            
        id = db.sequence_file.insert(sampling_date=request.vars['sampling_date'],
                            info=request.vars['file_info'],
                            pcr=request.vars['pcr'],
                            sequencer=request.vars['sequencer'],
                            producer=request.vars['producer'],
                            patient_id=request.vars['patient_id'],
                            filename=request.vars['filename'])
    
        res = {"file_id" : id,
               "message": request.vars['filename'] + ": upload started",
               "redirect": "patient/info",
               "args" : {"id" : request.vars['patient_id']}
               }
        
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
        
    else :
        res = {"success" : "false", "message" : error}
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))


def edit(): 
    if auth.has_permission('admin', 'patient', request.vars['patient_id']):
        return dict(message=T('edit file'))
    #elif not auth.has_permission('upload', 'sequence_file', request.vars['id'], auth.user_id):
    #    res = {"success" : "false", "message" : "you don't have right to upload files"}
    #    return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
    else:
        res = {"success" : "false", "message" : "you need admin permission to edit files"}
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
        


#TODO check data
def edit_form(): 
    import shutil, os.path, datetime
    error = ""
    
    if request.vars['id'] == None :
        error += "missing id"
    if request.vars['filename'] == None :
        error += " missing filename"
            
    if error=="" :
        query = db((db.sequence_file.patient_id==db.sequence_file[request.vars['id']].patient_id)).select()
        for row in query :
            if row.filename == request.vars['filename'] :
                res = {"message": "this sequence file already exists for this patient"}
                return gluon.contrib.simplejson.dumps(res, separators=(',',':'))

        mes = "file " + request.vars['id'] + " : "
        if request.vars['sampling_date'] != None and request.vars['file_info'] != None :
            db.sequence_file[request.vars["id"]] = dict(sampling_date=request.vars['sampling_date'],
                                                        info=request.vars['file_info'],
                                                        pcr=request.vars['pcr'],
                                                        sequencer=request.vars['sequencer'],
                                                        producer=request.vars['producer'])
            
        patient_id = db.sequence_file[request.vars["id"]].patient_id
        
        res = {"file_id" : request.vars['id'],
               "redirect": "patient/info",
               "args" : { "id" : patient_id},
               "message": "change saved"}
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))

def upload(): 
    session.forget(response)
    error = ""
    if request.vars['id'] == None :
        error += "missing id"
    
    if error=="" :
            
        mes = "file " + request.vars['id'] + " : "
        if request.vars.file != None :
            f = request.vars.file
            db.sequence_file[request.vars["id"]] = dict(data_file = db.sequence_file.data_file.store(f.file, f.filename))
            mes = f.filename + ": upload finished"
        
        res = {"message": mes}
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
  

def confirm():
    if auth.has_permission('admin', 'patient', request.vars['patient_id']):
        return dict(message=T('confirm sequence file deletion'))
    else:
        res = {"success" : "false", "message" : "you need admin permission to delete this file"}
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
        

def delete():
    import shutil, os.path
    
    patient_id = db.sequence_file[request.vars["id"]].patient_id
    
    if auth.has_permission('admin', 'patient', patient_id):
        db(db.sequence_file.id == request.vars["id"]).delete()
        db(db.data_file.sequence_file_id == request.vars["id"]).delete()

        res = {"redirect": "patient/info",
               "args" : { "id" : patient_id},
               "message": "sequence file deleted"}
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
    else:
        res = {"success" : "false", "message" : "you need admin permission to delete this file"}
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
    

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
