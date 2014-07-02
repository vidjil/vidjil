import gluon.contrib.simplejson
if request.env.http_origin:
    response.headers['Access-Control-Allow-Origin'] = request.env.http_origin  
    response.headers['Access-Control-Allow-Credentials'] = 'true'
    response.headers['Access-Control-Max-Age'] = 86400
        
## return user list
def index():
    return dict(message=T('user list'))

## return user information
## need ["id"]
def info():
    return dict(message=T('user info'))

def rights():
    if auth.has_membership("admin"):
        id = request.vars["id"]
        group_id = auth.user_group(id)
        
        if request.vars["value"] == "true" : 
            auth.add_permission(group_id, 'create', request.vars["name"], 0)
        else :
            auth.del_permission(group_id, 'create', request.vars["name"], 0)
        
        res = { "redirect": "user/info",
                "args" : {"id" : id },
                "message": "permission changed"}
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
    else :
        res = {"message": "acces denied"}
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
