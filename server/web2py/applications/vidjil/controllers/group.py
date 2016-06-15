import gluon.contrib.simplejson
if request.env.http_origin:
    response.headers['Access-Control-Allow-Origin'] = request.env.http_origin  
    response.headers['Access-Control-Allow-Credentials'] = 'true'
    response.headers['Access-Control-Max-Age'] = 86400

## return group list
def index():
    count = db.auth_group.id.count()
    query = db(
       db.auth_membership.group_id == db.auth_group.id
    ).select(db.auth_group.ALL, count, groupby = db.auth_group.id, orderby=db.auth_group.role)

    for row in query:
        row.parents = ', '.join(str(value) for value in auth.get_group_parent(row.auth_group.id))

    return dict(message=T('Groups'), query=query, count=count)

## return an html form to add a group
def add():
    if auth.is_admin():
        groups = db(db.auth_group).select()
    else:
        groups = auth.get_user_groups()
    return dict(message=T('New group'), groups=groups)


## create a group if the html form is complete
## need ["group_name", "info"]
## redirect to group list if success
## return a flash error message if error
def add_form(): 
    error = ""

    if request.vars["group_name"] == "" :
        error += "group name needed, "

    if error=="" :
        id = db.auth_group.insert(role=request.vars["group_name"],
                               description=request.vars["info"])
        user_group = auth.user_group(auth.user.id)

        #group creator is a group member
        auth.add_membership(id, auth.user.id)

        # Associate group with parent group network
        group_parent = request.vars["group_parent"]
        if group_parent != None and group_parent != 'None':
            parent_list = db(db.group_assoc.second_group_id == group_parent).select(db.group_assoc.ALL)
            parent = None
            if len(parent_list) > 0:
                for parent in parent_list:
                    db.group_assoc.insert(first_group_id=parent.first_group_id, second_group_id=id)
                    auth.add_permission(parent.first_group_id, PermissionEnum.group_admin.value, id)
            else:
                db.group_assoc.insert(first_group_id=group_parent, second_group_id=id)
                auth.add_permission(group_parent, PermissionEnum.admin_group.value, id)
        else:
            auth.add_permission(id, PermissionEnum.admin_group.value, id)

        res = {"redirect": "group/index",
               "message" : "group '%s' created" % id}
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
           "message": "group '%s' deleted" % request.vars["id"]}
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
    if auth.can_modify_group(request.vars["group_id"]):
        auth.add_membership(request.vars["group_id"], request.vars["user_id"])
        res = {"redirect" : "group/info" ,
               "args" : { "id" : request.vars["group_id"]},
               "message" : "user '%s' added to group '%s'" % (request.vars["user_id"], request.vars["group_id"])}
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
    if auth.can_modify_group(request.vars["group_id"]):
        auth.del_membership(request.vars["group_id"], request.vars["user_id"])
        res = {"redirect" : "group/info" ,
               "args" : { "id" : request.vars["group_id"]},
               "message" : "user '%s' removed from group '%s'" % (request.vars["user_id"], request.vars["group_id"])}
        log.info(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))

    else:
        res = {"redirect" : "group/info" ,
               "args" : { "id" : request.vars["group_id"]},
               "message" : "you don't have permission to kick people"}
        log.error(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))

def rights():
    if auth.is_admin():
        group_id = request.vars["id"]
        msg = ""

        if request.vars["value"] == "true" :
            auth.add_permission(group_id, request.vars["right"], request.vars["name"], 0)
            msg += "add '" + request.vars["right"] + "' permission on '" + request.vars["name"] + "' for group " + db.auth_group[group_id].role
        else :
            auth.del_permission(group_id, request.vars["right"], request.vars["name"], 0)
            msg += "remove '" + request.vars["right"] + "' permission on '" + request.vars["name"] + "' for group " + db.auth_group[group_id].role

        res = { "redirect": "group/info",
                "args" : {"id" : group_id },
                "message": msg}
        log.admin(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
    else :
        res = {"message": "admin only"}
        log.error(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
