# coding: utf8

def add(): 
    if request.env.http_origin:
        response.headers['Access-Control-Allow-Origin'] = request.env.http_origin  
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        response.headers['Access-Control-Max-Age'] = 86400
    return dict(message=T('add file'))

#TODO check data
def add_form(): 
    import gluon.contrib.simplejson, shutil, os.path
    if request.env.http_origin:
        response.headers['Access-Control-Allow-Origin'] = request.env.http_origin  
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        response.headers['Access-Control-Max-Age'] = 86400
        
    id = db.sequence_file.insert(data_file = request.vars.file )
  
    name = ""
    query = db( ( db.sequence_file.id==id)).select() 
    for row in query :
        name = db.sequence_file.data_file.retrieve(row.data_file)[0]
    
    
    db.sequence_file[id] = dict(sampling_date=request.vars['sampling_date'],
                                info=request.vars['file_info'],
                                patient_id=request.vars['patient_id'],
                                filename=name)
    
    res = {"success": "true" }
    return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
