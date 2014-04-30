def index():
    import gluon.contrib.simplejson
    if request.env.http_origin:
        response.headers['Access-Control-Allow-Origin'] = request.env.http_origin  
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        response.headers['Access-Control-Max-Age'] = 86400
    
    return dict(message=T('group list'))


def add(): 
    if request.env.http_origin:
        response.headers['Access-Control-Allow-Origin'] = request.env.http_origin  
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        response.headers['Access-Control-Max-Age'] = 86400
    return dict(message=T('new group'))

def add_form(): 
    import gluon.contrib.simplejson, datetime
    if request.env.http_origin:
        response.headers['Access-Control-Allow-Origin'] = request.env.http_origin  
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        response.headers['Access-Control-Max-Age'] = 86400
        
        error = ""
        
        if request.vars["group_name"] == "" :
            error += "group name needed, "

        if error=="" :
            id = db.auth_group.insert(role=request.vars["group_name"],
                                   description=request.vars["info"])
            
            #group creator is a group member
            auth.add_membership(id, auth.user.id)

            res = {"redirect": "group/index",
                   "message" : "group created"}
            return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
        
        else :
            res = {"success" : "false", "message" : error}
            return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
            
        
    res2 = {"success" : "false", "error" : "connect error"}
    return gluon.contrib.simplejson.dumps(res2, separators=(',',':'))


def confirm():
    if request.env.http_origin:
        response.headers['Access-Control-Allow-Origin'] = request.env.http_origin  
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        response.headers['Access-Control-Max-Age'] = 86400
    return dict(message=T('confirm group deletion'))

def delete():
    import gluon.contrib.simplejson
    if request.env.http_origin:
        response.headers['Access-Control-Allow-Origin'] = request.env.http_origin  
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        response.headers['Access-Control-Max-Age'] = 86400
    
    #delete group
    db(db.auth_group.id == request.vars["id"]).delete()
    
    res = {"redirect": "group/index",
           "message": "group deleted"}
    return gluon.contrib.simplejson.dumps(res, separators=(',',':'))

def info():
    import gluon.contrib.simplejson
    if request.env.http_origin:
        response.headers['Access-Control-Allow-Origin'] = request.env.http_origin  
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        response.headers['Access-Control-Max-Age'] = 86400
    return dict(message=T('group info'))
