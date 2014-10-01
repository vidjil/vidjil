import gluon.contrib.simplejson
if request.env.http_origin:
    response.headers['Access-Control-Allow-Origin'] = request.env.http_origin  
    response.headers['Access-Control-Allow-Credentials'] = 'true'
    response.headers['Access-Control-Max-Age'] = 86400

## return group list
def index():
    return dict(message=T('group list'))

## return an html form to add a group
def add(): 
    return dict(message=T('new group'))


## create a group if the html form is complete
## need ["group_name", "info"]
## redirect to group list if success
## return a flash error message if error
def add_form(): 
    import gluon.contrib.simplejson, datetime
    error = ""

    if request.vars["group_name"] == "" :
        error += "group name needed, "

    if error=="" :
        id = db.auth_group.insert(role=request.vars["group_name"],
                               description=request.vars["info"])
        user_group = auth.user_group(auth.user.id)

        #group creator is a group member
        auth.add_membership(id, auth.user.id)

        #group creator = group admin
        auth.add_permission(user_group, 'admin', db.auth_group, id)

        res = {"redirect": "group/index",
               "message" : "group created"}
        log.info(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))

    else :
        res = {"success" : "false", "message" : error}
        log.error(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))


## confirm page before group deletion
## need ["id"]
def confirm():
    return dict(message=T('confirm group deletion'))


## delete group
## need ["id"]
## redirect to group list if success
def delete():
    #delete group
    db(db.auth_group.id == request.vars["id"]).delete()
    
    res = {"redirect": "group/index",
           "message": "group deleted"}
    log.info(res)
    return gluon.contrib.simplejson.dumps(res, separators=(',',':'))


## return list of group member
## need ["id"]
def info():
    return dict(message=T('group info'))


## return list of group admin
## need ["id"]
def permission(): 
    return dict(message=T('permission'))

## remove admin right
## need ["group_id", "user_id"]
def remove_permission():
    error = ""

    if request.vars["group_id"] == "" :
        error += "missing group_id, "
    if request.vars["user_id"] == "" :
        error += "missing user_id, "

    if error=="":
        auth.del_permission(auth.user_group(request.vars["user_id"]), 'admin', db.auth_group, request.vars["group_id"])

    res = {"redirect" : "group/permission" ,
           "args" : { "id" : request.vars["group_id"]} }
    log.info(res)
    return gluon.contrib.simplejson.dumps(res, separators=(',',':'))

## give admin right to a group member
## need ["group_id", "user_id"]
def change_permission():
    auth.add_permission(auth.user_group(request.vars["user_id"]), 'admin', db.auth_group, request.vars["group_id"])

    res = {"redirect" : "group/permission" , "args" : { "id" : request.vars["group_id"]} }
    log.info(res)
    return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
    
## invite an user to join the group
## need ["group_id", "user_id"]
def invite():
    #check admin 
    if auth.has_permission('admin', 'auth_group', request.vars["group_id"], auth.user.id):
        auth.add_membership(request.vars["group_id"], request.vars["user_id"])
        res = {"redirect" : "group/info" ,
               "args" : { "id" : request.vars["group_id"]},
               "message" : "user have been invited to join this group"}
        log.info(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))

    else:
        res = {"redirect" : "group/info" ,
               "args" : { "id" : request.vars["group_id"]},
               "message" : "you don't have permission to invite people"}
        log.error(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
        
## revoke membership
## need ["group_id", "user_id"]
def kick():
    #check admin 
    if auth.has_permission('admin', 'auth_group', request.vars["group_id"], auth.user.id):
        auth.del_membership(request.vars["group_id"], request.vars["user_id"])
        res = {"redirect" : "group/info" ,
               "args" : { "id" : request.vars["group_id"]},
               "message" : "user have been kicked"}
        log.info(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))

    else:
        res = {"redirect" : "group/info" ,
               "args" : { "id" : request.vars["group_id"]},
               "message" : "you don't have permission to kick people"}
        log.error(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
