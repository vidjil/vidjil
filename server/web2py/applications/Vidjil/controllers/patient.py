# coding: utf8

def info():
    if request.env.http_origin:
        response.headers['Access-Control-Allow-Origin'] = request.env.http_origin  
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        response.headers['Access-Control-Max-Age'] = 86400
    response.title = ""
    return dict(message=T('patient'))

def index():
    import gluon.contrib.simplejson
    if request.env.http_origin:
        response.headers['Access-Control-Allow-Origin'] = request.env.http_origin  
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        response.headers['Access-Control-Max-Age'] = 86400
    
    if not auth.user : 
        res = {"redirect" : "default/user/login"}
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
    
    return dict(message=T('patient list'))

def add(): 
    if request.env.http_origin:
        response.headers['Access-Control-Allow-Origin'] = request.env.http_origin  
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        response.headers['Access-Control-Max-Age'] = 86400
    return dict(message=T('add patient'))

def add_form(): 
    import gluon.contrib.simplejson, datetime
    if request.env.http_origin:
        response.headers['Access-Control-Allow-Origin'] = request.env.http_origin  
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        response.headers['Access-Control-Max-Age'] = 86400
        
        error = ""
        
        if request.vars["first_name"] == "" :
            error += "first name needed, "
        if request.vars["last_name"] == "" :
            error += "last name needed, "
        try:
            datetime.datetime.strptime(""+request.vars['birth'], '%Y-%m-%d')
        except ValueError:
            error += "date missing or wrong format"
        
        if error=="" :
            id = db.patient.insert(first_name=request.vars["first_name"],
                                   last_name=request.vars["last_name"],
                                   birth=request.vars["birth"],
                                   info=request.vars["info"])
            
            
            user_group = auth.user_group(auth.user.id)
            admin_group = db(db.auth_group.role=='admin').select().first().id
            
            auth.add_permission(user_group, 'read', db.patient, id)
            auth.add_permission(user_group, 'admin', db.patient, id)

            res = {"success": "true" }
            return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
        
        else :
            res = {"success" : "false", "error" : error}
            return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
            
        
    res2 = {"success" : "false", "error" : "connect error"}
    return gluon.contrib.simplejson.dumps(res2, separators=(',',':'))


def edit(): 
    if request.env.http_origin:
        response.headers['Access-Control-Allow-Origin'] = request.env.http_origin  
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        response.headers['Access-Control-Max-Age'] = 86400
    return dict(message=T('edit patient'))

def edit_form(): 
    import gluon.contrib.simplejson, datetime
    if request.env.http_origin:
        response.headers['Access-Control-Allow-Origin'] = request.env.http_origin  
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        response.headers['Access-Control-Max-Age'] = 86400
        
        error = ""
        
        if request.vars["first_name"] == "" :
            error += "first name needed, "
        if request.vars["last_name"] == "" :
            error += "last name needed, "
        try:
            datetime.datetime.strptime(""+request.vars['birth'], '%Y-%m-%d')
        except ValueError:
            error += "date missing or wrong format"
        if request.vars["id"] == "" :
            error += "patient id needed, "
        
        if error=="" :
            db.patient[request.vars["id"]] = dict(first_name=request.vars["first_name"],
                                                   last_name=request.vars["last_name"],
                                                   birth=request.vars["birth"],
                                                   info=request.vars["info"]
                                                   )
            
            res = {"success": "true" }
            return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
        
        else :
            res = {"success" : "false", "error" : error}
            return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
        
        
@cache.action()
def download():
    if request.env.http_origin:
        response.headers['Access-Control-Allow-Origin'] = request.env.http_origin  
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        response.headers['Access-Control-Max-Age'] = 86400
    """
    allows downloading of uploaded files
    http://..../[app]/default/download/[filename]
    """
    return response.download(request, db)

def confirm():
    if request.env.http_origin:
        response.headers['Access-Control-Allow-Origin'] = request.env.http_origin  
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        response.headers['Access-Control-Max-Age'] = 86400
    return dict(message=T('confirm patient deletion'))

def delete():
    import gluon.contrib.simplejson, shutil, os.path
    if request.env.http_origin:
        response.headers['Access-Control-Allow-Origin'] = request.env.http_origin  
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        response.headers['Access-Control-Max-Age'] = 86400
    
    #delete data file 
    query = db( (db.sequence_file.patient_id==request.vars["id"])).select() 
    for row in query :
        db(db.data_file.sequence_file_id == row.id).delete()
    
    #delete sequence file
    db(db.sequence_file.patient_id == request.vars["id"]).delete()
    
    #delete patient
    db(db.patient.id == request.vars["id"]).delete()
    
    res = {"success": "true" }
    return gluon.contrib.simplejson.dumps(res, separators=(',',':'))

def permission(): 
    if request.env.http_origin:
        response.headers['Access-Control-Allow-Origin'] = request.env.http_origin  
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        response.headers['Access-Control-Max-Age'] = 86400
    return dict(message=T('permission'))
