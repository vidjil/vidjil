import gluon.contrib.simplejson
if request.env.http_origin:
    response.headers['Access-Control-Allow-Origin'] = request.env.http_origin  
    response.headers['Access-Control-Allow-Credentials'] = 'true'
    response.headers['Access-Control-Max-Age'] = 86400
        
## return user list
def index():
    
    query = db(db.auth_user).select()
    
    for row in query :
        row.created = db( db.patient.creator == row.id ).count()
        
        row.size = 0
        row.files = 0
        query_size = db( db.sequence_file.provider == row.id ).select()
        
        for row2 in query_size:
            row.files += 1
            row.size += row2.size_file
            
    return dict(query=query)

## return user information
## need ["id"]
def info():
    return dict(message=T('user info'))

def rights():
    if auth.has_membership("admin"):
        id = request.vars["id"]
        group_id = auth.user_group(id)
        msg = ""
        
        if request.vars["value"] == "true" : 
            auth.add_permission(group_id, request.vars["right"], request.vars["name"], 0)
            msg += "add '" + request.vars["right"] + "' permission on '" + request.vars["name"] + "' for user " + db.auth_user[id].first_name + " " + db.auth_user[id].last_name
        else :
            auth.del_permission(group_id, request.vars["right"], request.vars["name"], 0)
            msg += "remove '" + request.vars["right"] + "' permission on '" + request.vars["name"] + "' for user " + db.auth_user[id].first_name + " " + db.auth_user[id].last_name
        
        res = { "redirect": "user/info",
                "args" : {"id" : id },
                "message": msg}
        log.info(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
    else :
        res = {"message": "admin only"}
        log.error(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
