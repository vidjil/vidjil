# coding: utf8
import gluon.contrib.simplejson
if request.env.http_origin:
    response.headers['Access-Control-Allow-Origin'] = request.env.http_origin  
    response.headers['Access-Control-Allow-Credentials'] = 'true'
    response.headers['Access-Control-Max-Age'] = 86400

    
ACCESS_DENIED = "access denied"

def index():
    if not auth.user : 
        res = {"redirect" : "default/user/login"}
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))

    query = db((auth.vidjil_accessible_query(PermissionEnum.read_pre_process.value, db.pre_process) | auth.vidjil_accessible_query(PermissionEnum.admin_pre_process.value, db.pre_process) ) ).select(orderby=~db.pre_process.name)

    return dict(message=T('Pre-process list'),
               query=query,
               isAdmin = auth.is_admin())


def add():
    if auth.can_create_pre_process():
        return dict(message=T('Add pre-process'))
    return error_message(ACCESS_DENIED)


def add_form():
    if not auth.can_create_pre_process():
        return error_message(ACCESS_DENIED)
    error =""

    required_fields = ['pre_process_name', 'pre_process_command']
    for field in required_fields:
        if request.vars[field] == "" :
            error += field+" needed, "

    if error=="" :
        
        pre_proc_id = db.pre_process.insert(name=request.vars['pre_process_name'],
                        info=request.vars['pre_process_info'],
                        command=request.vars['pre_process_command']
                        )

	auth.add_permission(auth.user_group(), PermissionEnum.read_pre_process.value, db.pre_process, pre_proc_id)

        res = {"redirect": "pre_process/index",
               "message": "pre_process '%s' added" % request.vars['pre_process_name']}
        log.admin(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
        
    else :
        res = {"success" : "false", "message" : error}
        log.error(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))


def edit(): 
    if auth.can_modify_pre_process(request.vars['id']):
        return dict(message=T('edit config'))
    return error_message(ACCESS_DENIED)


def edit_form(): 
    if not auth.can_modify_pre_process(request.vars['id']):
        return error_message(ACCESS_DENIED)
    error =""

    required_fields = ['pre_process_name', 'pre_process_command']
    for field in required_fields:
        if request.vars[field] == "" :
            error += field+" needed, "

    if error=="" :

        db.pre_process[request.vars["id"]] = dict(name=request.vars['pre_process_name'],
                        info=request.vars['pre_process_info'],
                        command=request.vars['pre_process_command']
                        )

        res = {"redirect": "pre_process/index",
               "message": "pre_process '%s' updated" % request.vars['pre_process_name']}

        log.admin(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))

    else :
        res = {"success" : "false", "message" : error}
        log.error(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))

def confirm():
    if auth.can_modify_pre_process(request.vars['id']):
        return dict(message=T('confirm pre_process deletion'))
    return error_message(ACCESS_DENIES)

def delete():
    
    if not auth.can_modify_pre_process(request.vars['id']):
        return error_message(ACCESS_DENIED)
    #delete pre_process
    db(db.pre_process.id==request.vars["id"]).delete() 
    
    res = {"redirect": "pre_process/index",
           "message": "pre_process '%s' deleted" % request.vars["id"]}
    log.admin(res)
    return gluon.contrib.simplejson.dumps(res, separators=(',',':'))

## need ["sequence_file_id"]
## need ["sample_set_id"]
def info():
    if (auth.can_modify_sample_set(request.vars["sample_set_id"])):
        return dict(message=T('result info'))
    else :
        res = {"message": "acces denied"}
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))

def permission():
    if (not auth.can_modify_pre_process(request.vars["id"]) ):
        res = {"message": ACCESS_DENIED}
        log.error(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))

    query = db( (db.auth_group.role != 'admin') ).select()

    query2 = db( (db.auth_group.role != 'admin') &
                (db.auth_membership.group_id == db.auth_group.id) &
                (db.auth_membership.user_id == db.auth_user.id)    
              ).select()

    usermap = {}
    for row in query2 : 
        if row.auth_group.role[:5] == "user_" :
            usermap[row.auth_group.role] = row.auth_user.id 

    for row in query :
        row.owner = row.role
        if row.owner[:5] == "user_" :
            id = usermap[row.owner]
            row.owner = db.auth_user[id].first_name + " " + db.auth_user[id].last_name

        permissions = db(
                (db.auth_permission.group_id == row.id) &
                (db.auth_permission.record_id == 0) &
                (db.auth_permission.table_name == 'sample_set')).select()
        row.perms = ', '.join(map(lambda x: x.name, permissions))

        row.parent_access = ', '.join(str(value) for value in auth.get_access_groups(db.pre_process, request.vars['id'], group=row.id))
        row.read =  auth.get_group_access('pre_process', request.vars['id'], row.id)

    return dict(query = query)

#TODO refactor with patient/change_permission
def change_permission():
    if (not auth.can_modify_pre_process(request.vars["pre_process_id"]) ):
        res = {"message": ACCESS_DENIED}
        log.error(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))

    error = ""
    if request.vars["group_id"] == "" :
        error += "missing group_id, "
    if request.vars["pre_process_id"] == "" :
        error += "missing pre_process_id, "

    if error=="":
        if auth.get_group_access(db.pre_process, int(request.vars["pre_process_id"]), int(request.vars["group_id"])):
            auth.del_permission(request.vars["group_id"], PermissionEnum.access.value, db.config, request.vars["pre_process_id"])
            res = {"message" : "c%s: access '%s' deleted to '%s'" % (request.vars["pre_process_id"],
                                                                     PermissionEnum.access.value, db.auth_group[request.vars["group_id"]].role)}
        else :
            auth.add_permission(request.vars["group_id"], PermissionEnum.access.value, db.pre_process, request.vars["pre_process_id"])
            res = {"message" : "c%s: access '%s' granted to '%s'" % (request.vars["pre_process_id"],
                                                                     PermissionEnum.access.value, db.auth_group[request.vars["group_id"]].role)}

        log.admin(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
    else :
        res = {"message": "incomplete request : "+error }
        log.error(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
