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
    

    query = db((auth.accessible_query('read', db.config) | auth.accessible_query('admin', db.config) ) ).select(orderby=~db.config.name)

    return dict(message=T('Configs'),
               query=query,
               isAdmin = auth.is_admin())


def add(): 
    return dict(message=T('Add config'))


#TODO check data
def add_form(): 
    error =""

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
                                name='create',
                                table_name='config',
                                record_id=config_id)

        res = {"redirect": "config/index",
               "message": "config '%s' added" % request.vars['config_name']}
        log.admin(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
        
    else :
        res = {"success" : "false", "message" : error}
        log.error(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))


def edit():
    if (auth.can_modify_config(request.vars['config_id'])):
        return dict(message=T('edit config'))
    return error_message(ACCESS_DENIED)


def edit_form(): 
    error =""

    if (not auth.can_modify_config(request.vars['config_id'])):
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
        #delete results_file using this config
        db(db.results_file.config_id==request.vars["id"]).delete()

        #delete config
        db(db.config.id==request.vars["id"]).delete()

        res = {"redirect": "config/index",
               "message": "config '%s' deleted" % request.vars["id"]}
        log.admin(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
    return error_message(ACCESS_DENIED)


def permission(): 
    if (auth.can_modify_patient(request.vars["id"]) ):
        
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

            row.admin = False
            if db(   (db.auth_permission.name == "admin")
                  & (db.auth_permission.record_id == request.vars["id"])
                  & (db.auth_permission.group_id == row.id)
                  & (db.auth_permission.table_name == db.config)
              ).count() > 0 :
                row.admin = True
                
            row.read = False
            if db(   (db.auth_permission.name == "read")
                  & (db.auth_permission.record_id == request.vars["id"])
                  & (db.auth_permission.group_id == row.id)
                  & (db.auth_permission.table_name == db.config)
              ).count() > 0 :
                row.read = True
        
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
        if request.vars["permission"] == "" :
            error += "missing permission, "

        if error=="":
            if db(   (db.auth_permission.name == request.vars["permission"])
                      & (db.auth_permission.record_id == request.vars["config_id"])
                      & (db.auth_permission.group_id == request.vars["group_id"])
                      & (db.auth_permission.table_name == db.config)
                  ).count() > 0 :
                auth.del_permission(request.vars["group_id"], request.vars["permission"], db.config, request.vars["config_id"])
                res = {"message" : "c%s: access '%s' deleted to '%s'" % (request.vars["config_id"],
                                                                         request.vars["permission"], db.auth_group[request.vars["group_id"]].role)}
            else :
                auth.add_permission(request.vars["group_id"], request.vars["permission"], db.config, request.vars["config_id"])
                res = {"message" : "c%s: access '%s' granted to '%s'" % (request.vars["config_id"],
                                                                         request.vars["permission"], db.auth_group[request.vars["group_id"]].role)}
            
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
