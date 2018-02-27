# coding: utf8
import gluon.contrib.simplejson
from controller_utils import error_message
if request.env.http_origin:
    response.headers['Access-Control-Allow-Origin'] = request.env.http_origin  
    response.headers['Access-Control-Allow-Credentials'] = 'true'
    response.headers['Access-Control-Max-Age'] = 86400

    
ACCESS_DENIED = "access denied"

def index():
    if not auth.user : 
        res = {"redirect" : "default/user/login"}
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
    

    query = db((auth.vidjil_accessible_query(PermissionEnum.read_config.value, db.config) | auth.vidjil_accessible_query(PermissionEnum.admin_config.value, db.config) ) ).select(orderby=~db.config.name)
    used_query = db(db.results_file.config_id > 0).select(db.results_file.config_id, distinct=True)
    used_configs = [row.config_id for row in used_query]

    return dict(message=T('Configs'),
               query=query,
               used_configs=used_configs,
               isAdmin = auth.is_admin())


def add():
    if (auth.can_create_config()):
        return dict(message=T('Add config'))
    return error_message(ACCESS_DENIED)


#TODO check data
def add_form(): 
    error =""
    if (not auth.can_create_config()):
        return error_message(ACCESS_DENIED)

    required_fields = ['config_name', 'config_command', 'config_fuse_command', 'config_program']
    for field in required_fields:
        if request.vars[field] == "" :
            error += field+" needed, "

    if error=="" :
        
        config_id = db.config.insert(name=request.vars['config_name'],
                        info=request.vars['config_info'],
                        command=request.vars['config_command'],
                        fuse_command=request.vars['config_fuse_command'],
                        program=request.vars['config_program']
                        )

        user_group = None
        group_ids = list(auth.user_groups.keys())
        for gid in group_ids:
            if (auth.user_groups[gid] != 'public'):
                user_group = gid
                break

        db.auth_permission.insert(group_id=user_group,
                                name=PermissionEnum.create_config.value,
                                table_name='config',
                                record_id=config_id)

        res = {"redirect": "config/index",
               "message": "config '%s' added" % request.vars['config_name']}
        log.info(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
        
    else :
        res = {"success" : "false", "message" : error}
        log.error(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))


def edit():
    if (auth.can_modify_config(request.vars['id'])):
        return dict(message=T('edit config'))
    return error_message(ACCESS_DENIED)


def edit_form(): 
    error =""

    if (not auth.can_modify_config(request.vars['id'])):
        error += "ACCESS_DENIED"

    required_fields = ['id', 'config_name', 'config_command', 'config_fuse_command', 'config_program']
    for field in required_fields:
        if request.vars[field] == "" :
            error += field+" needed, "

    if error=="" :

        db.config[request.vars["id"]] = dict(name=request.vars['config_name'],
                                             info=request.vars['config_info'],
                                             command=request.vars['config_command'],
                                             fuse_command=request.vars['config_fuse_command'],
                                             program=request.vars['config_program']
                                             )

        res = {"redirect": "config/index",
               "message": "config '%s' updated" % request.vars['config_name']}

        log.admin(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))

    else :
        res = {"success" : "false", "message" : error}
        log.error(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))

def confirm():
    if (auth.can_modify_config(request.vars['id'])):
        return dict(message=T('confirm config deletion'))
    return error_message(ACCESS_DENIED)

def delete():
    if (auth.can_modify_config(request.vars['id'])):
        count = db(db.results_file.config_id==request.vars["id"]).count()

        if (count == 0):
            #delete config
            db(db.config.id==request.vars["id"]).delete()

            res = {"redirect": "config/index",
                   "message": "config '%s' deleted" % request.vars["id"]}
            log.admin(res)
        else:
            res = {"redirect": "config/index",
                    "success": "false",
                    "message": "cannot delete a config that has been used"}
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
    return error_message(ACCESS_DENIED)


def permission(): 
    if (auth.can_modify_config(request.vars["id"]) ):
        
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

            row.parent_access = ', '.join(str(value) for value in auth.get_access_groups(db.config, request.vars['id'], group=row.id))
            row.read =  auth.get_group_access('config', request.vars['id'], row.id)
        
        return dict(query = query)
    else :
        res = {"message": ACCESS_DENIED}
        log.error(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
    
#TODO refactor with patient/change_permission
def change_permission():
    if (auth.can_modify_config(request.vars["config_id"]) ):
        error = ""
        if request.vars["group_id"] == "" :
            error += "missing group_id, "
        if request.vars["config_id"] == "" :
            error += "missing patient_id, "

        if error=="":
            if auth.get_group_access(db.config, int(request.vars["config_id"]), int(request.vars["group_id"])):
                auth.del_permission(request.vars["group_id"], PermissionEnum.access.value, db.config, request.vars["config_id"])
                res = {"message" : "c%s: access '%s' deleted to '%s'" % (request.vars["config_id"],
                                                                         PermissionEnum.access.value, db.auth_group[request.vars["group_id"]].role)}
            else :
                auth.add_permission(request.vars["group_id"], PermissionEnum.access.value, db.config, request.vars["config_id"])
                res = {"message" : "c%s: access '%s' granted to '%s'" % (request.vars["config_id"],
                                                                         PermissionEnum.access.value, db.auth_group[request.vars["group_id"]].role)}
            
            log.admin(res)
            return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
        else :
            res = {"message": "incomplete request : "+error }
            log.error(res)
            return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
    else :
        res = {"message": ACCESS_DENIED}
        log.error(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
