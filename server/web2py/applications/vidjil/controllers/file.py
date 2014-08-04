# coding: utf8
import gluon.contrib.simplejson
if request.env.http_origin:
    response.headers['Access-Control-Allow-Origin'] = request.env.http_origin  
    response.headers['Access-Control-Allow-Credentials'] = 'true'
    response.headers['Access-Control-Max-Age'] = 86400


def add(): 
    if auth.has_permission('admin', 'patient', request.vars['id'], auth.user_id):
        return dict(message=T('add file'))
    else :
        res = {"success" : "false", "message" : "you need admin permission on this patient to add file"}
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))


#TODO check data
def add_form(): 
    import shutil, os.path, datetime
    error = ""
    
    if request.vars['sampling_date'] != None :
        try:
            datetime.datetime.strptime(""+request.vars['sampling_date'], '%Y-%m-%d')
        except ValueError:
            error += "date missing or wrong format, "
            
    if error=="" :
        id = db.sequence_file.insert(sampling_date=request.vars['sampling_date'],
                            info=request.vars['file_info'],
                            pcr=request.vars['pcr'],
                            sequencer=request.vars['sequencer'],
                            producer=request.vars['producer'],
                            patient_id=request.vars['patient_id'])
    
        res = {"file_id" : id,
               "message": "info file added",
               "redirect": "patient/info",
               "args" : {"id" : request.vars['patient_id']}
               }
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
        
    else :
        res = {"success" : "false", "message" : error}
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))


def edit(): 
    return dict(message=T('edit file'))


#TODO check data
def edit_form(): 
    import shutil, os.path, datetime
    error = ""
    
    if request.vars['id'] == None :
        error += "missing id"
            
    if error=="" :

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
    import shutil, os.path, datetime
    error = ""
    
    if request.vars['id'] == None :
        error += "missing id"
            
    if error=="" :
            
        mes = "file " + request.vars['id'] + " : "
        if request.vars.file != None :
            db.sequence_file[request.vars["id"]] = dict(data_file = request.vars.file )
            mes += "file saved, "
            
        patient_id = db.sequence_file[request.vars["id"]].patient_id
        
        res = {"message": mes}
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
  

def confirm():
    return dict(message=T('confirm sequence file deletion'))
        

def delete():
    import shutil, os.path

    patient_id = db.sequence_file[request.vars["id"]].patient_id
    
    db(db.sequence_file.id == request.vars["id"]).delete()
    db(db.data_file.sequence_file_id == request.vars["id"]).delete()
    
    res = {"redirect": "patient/info",
           "args" : { "id" : patient_id},
           "message": "sequence file deleted"}
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
