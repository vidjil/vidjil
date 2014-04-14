# coding: utf8

def info():
    if request.env.http_origin:
        response.headers['Access-Control-Allow-Origin'] = request.env.http_origin  
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        response.headers['Access-Control-Max-Age'] = 86400
    response.title = ""
    return dict(message=T('patient'))

def index():
    if request.env.http_origin:
        response.headers['Access-Control-Allow-Origin'] = request.env.http_origin  
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        response.headers['Access-Control-Max-Age'] = 86400
    return dict(message=T('patient list'))

def add(): 
    if request.env.http_origin:
        response.headers['Access-Control-Allow-Origin'] = request.env.http_origin  
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        response.headers['Access-Control-Max-Age'] = 86400
    return dict(message=T('add patient'))

def add_form(): 
    import gluon.contrib.simplejson
    if request.env.http_origin:
        response.headers['Access-Control-Allow-Origin'] = request.env.http_origin  
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        response.headers['Access-Control-Max-Age'] = 86400
        
        error = ""
        
        if request.vars["first_name"] == "" :
            error += "first name needed, "
        if request.vars["last_name"] == "" :
            error += "last name needed, "
        if request.vars["birth"] == "" :
            error += "birth date needed, "
        '''if request.vars["birth"] == "" : 
            error += "birth date incorrect format, "  '''
        
        if error=="" :
            id = db.patient.insert(first_name=request.vars["first_name"],
                                   last_name=request.vars["last_name"],
                                   birth=request.vars["birth"],
                                   info=request.vars["info"]
                                   )
            '''TODO
            db.auth_permission.insert(group_id=auth.user_group(auth.user_id),
                                      name="read",
                                      table_name="patient",
                                      record_id=id)
            '''
            
            res = {"success": "true" }
            return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
        
        else :
            res = {"success" : "false", "error" : error}
            return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
            
        
    res2 = {"success" : "false", "error" : "connect error"}
    return gluon.contrib.simplejson.dumps(res2, separators=(',',':'))
