# -*- coding: utf-8 -*-
import base64
import datetime
from sys import modules


from .. import defs
from ..modules import vidjil_utils
from ..modules import tag
from ..modules.stats_decorator import *
from ..modules.controller_utils import error_message
from ..modules.permission_enum import PermissionEnum
from ..VidjilAuth import VidjilAuth
from io import StringIO
import json
from py4web import action, request, abort, redirect, URL, Field, HTTP, response
from collections import defaultdict

from ..common import db, session, T, flash, cache, authenticated, unauthenticated, auth, log, scheduler


###########################
# HELPERS
###########################
    
ACCESS_DENIED = "access denied"


@action("/vidjil/config/index", method=["POST", "GET"])
@action.uses("config/index.html", db, auth.user)
def index():
    if not auth.user : 
        res = {"redirect" : "default/user/login"}
        return json.dumps(res, separators=(',',':'))
    

    query = db((auth.vidjil_accessible_query(PermissionEnum.read_config.value, db.config) | auth.vidjil_accessible_query(PermissionEnum.admin_config.value, db.config) ) ).select(orderby=db.config.classification|db.config.name)
    used_query = db(db.results_file.config_id > 0).select(db.results_file.config_id, distinct=True)
    used_configs = [row.config_id for row in used_query]
    classification = db( (db.classification) ).select()

    mes = u"Access config list"
    log.info(mes, extra={'user_id': auth.user_id, 'record_id': -1, 'table_name': 'config'})

    return dict(message=T('Configs'),
               query=query,
               used_configs=used_configs,
               classification=classification,
               isAdmin = auth.is_admin(),
               auth=auth,
               db=db)


@action("/vidjil/config/add", method=["POST", "GET"])
@action.uses("config/add.html", db, auth.user)
def add():
    if (auth.can_create_config()):
        classification = db( (db.classification) ).select()
        return dict(message=T('Add config'), classification=classification, auth=auth, db=db)
    return error_message(ACCESS_DENIED)


@action("/vidjil/config/add_form", method=["POST", "GET"])
@action.uses(db, auth.user)
def add_form(): 
    error =""
    if (not auth.can_create_config()):
        return error_message(ACCESS_DENIED)

    required_fields = ['config_name', 'config_command', 'config_fuse_command', 'config_program']
    for field in required_fields:
        if request.params[field] == "" :
            error += field+" needed, "

    ## test if classification id exist
    if  request.params["config_classification"] != "-1":
        classification = db(db.classification.id ==  request.params["config_classification"]).count()
        if classification == 0:
            error += "classification id don't exist, "
    else :
        request.params["config_classification"] = None

    if error=="" :
        
        config_id = db.config.insert(name=request.params['config_name'],
                        info=request.params['config_info'],
                        command=request.params['config_command'],
                        fuse_command=request.params['config_fuse_command'],
                        program=request.params['config_program'],
                        classification=request.params['config_classification']
                        )

        mes = u"Added config"
        log.info(mes, extra={'user_id': auth.user_id, 'record_id': config_id, 'table_name': 'config'})

        res = {"redirect": "config/index",
               "message": "config '%s' added" % request.params['config_name']}
        log.info(res)
        return json.dumps(res, separators=(',',':'))
        
    else :
        res = {"success" : "false", "message" : error}
        log.error(res)
        return json.dumps(res, separators=(',',':'))

@action("/vidjil/config/edit", method=["POST", "GET"])
@action.uses("config/edit.html", db, auth.user)
def edit():
    if (auth.can_modify_config(int(request.query['id']))):
        mes = u"Load config edit form"
        classification = db( (db.classification) ).select()
        log.info(mes, extra={'user_id': auth.user_id, 'record_id': request.query['id'], 'table_name': 'config'})
        return dict(message=T('edit config'), classification=classification, auth=auth, db=db)
    return error_message(ACCESS_DENIED)

@action("/vidjil/config/edit_form", method=["POST", "GET"])
@action.uses(db, auth.user)
def edit_form(): 
    error =""

    if (not auth.can_modify_config(int(request.params['id']))):
        error += "ACCESS_DENIED"

    required_fields = ['id', 'config_name', 'config_command', 'config_fuse_command', 'config_program']
    for field in required_fields:
        if request.params[field] == "" :
            error += field+" needed, "
    
    ## test if classification id exist
    if  request.params["config_classification"] != "-1":
        classification = db(db.classification.id ==  request.params["config_classification"]).count()
        if classification == 0:
            error += "classification id don't exist, "
    else :
        request.params["config_classification"] = None


    if error=="" :

        db(db.config.id == request.params["id"]).update(name=request.params['config_name'],
                                             info=request.params['config_info'],
                                             command=request.params['config_command'],
                                             fuse_command=request.params['config_fuse_command'],
                                             program=request.params['config_program'],
                                             classification=request.params['config_classification']
                                             )

        res = {"redirect": "config/index",
               "message": "config '%s' updated" % request.params['config_name']}

        log.admin(res)
        mes = u"Submit config edit form"
        log.info(mes, extra={'user_id': auth.user_id, 'record_id': request.params['id'], 'table_name': 'config'})
        return json.dumps(res, separators=(',',':'))

    else :
        res = {"success" : "false", "message" : error}
        log.error(res)
        return json.dumps(res, separators=(',',':'))

@action("/vidjil/config/confirm", method=["POST", "GET"])
@action.uses("config/confirm.html", db, auth.user)
def confirm():
    if (auth.can_modify_config(int(request.query['id']))):
        return dict(message=T('confirm config deletion'), auth=auth, db=db)
    return error_message(ACCESS_DENIED)


@action("/vidjil/config/delete", method=["POST", "GET"])
@action.uses(db, auth.user)
def delete():
    if (auth.can_modify_config(int(request.query['id']))):
        count = db(db.results_file.config_id==request.query["id"]).count()

        if (count == 0):
            #delete config
            db(db.config.id==request.query["id"]).delete()

            res = {"redirect": "config/index",
                   "message": "config '%s' deleted" % request.query["id"]}
            log.admin(res)
            mes = u"Delete config"
            log.info(mes, extra={'user_id': auth.user_id, 'record_id': request.query['id'], 'table_name': 'config'})
        else:
            res = {"redirect": "config/index",
                    "success": "false",
                    "message": "cannot delete a config that has been used"}
        return json.dumps(res, separators=(',',':'))
    return error_message(ACCESS_DENIED)


@action("/vidjil/config/permission", method=["POST", "GET"])
@action.uses("config/permission.html", db, auth.user)
def permission(): 
    if (auth.can_modify_config(int(request.query["id"])) ):
        
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

            row.parent_access = ', '.join(str(value) for value in auth.get_access_groups(db.config, request.query['id'], group=row.id))
            row.read =  auth.get_group_access('config', request.query['id'], row.id)
        
        return dict(query = query, auth=auth, db=db)
    else :
        res = {"message": ACCESS_DENIED}
        log.error(res)
        return json.dumps(res, separators=(',',':'))
    
#TODO refactor with patient/change_permission
@action("/vidjil/config/change_permission", method=["POST", "GET"])
@action.uses(db, auth.user)
def change_permission():
    if (auth.can_modify_config(int(request.query["config_id"])) ):
        error = ""
        if request.query["group_id"] == "" :
            error += "missing group_id, "
        if request.query["config_id"] == "" :
            error += "missing patient_id, "

        if error=="":
            if auth.get_group_access(db.config, int(request.query["config_id"]), int(request.query["group_id"])):
                auth.del_permission(request.query["group_id"], PermissionEnum.access.value, db.config, request.query["config_id"])
                res = {"message" : "c%s: access '%s' deleted to '%s'" % (request.query["config_id"],
                                                                         PermissionEnum.access.value, db.auth_group[request.query["group_id"]].role)}
            else :
                auth.add_permission(request.query["group_id"], PermissionEnum.access.value, db.config, request.query["config_id"])
                res = {"message" : "c%s: access '%s' granted to '%s'" % (request.query["config_id"],
                                                                         PermissionEnum.access.value, db.auth_group[request.query["group_id"]].role)}
            
            log.admin(res, extra={'user_id': auth.user_id, 'record_id': request.query['config_id'], 'table_name': 'config'})
            return json.dumps(res, separators=(',',':'))
        else :
            res = {"message": "incomplete request : "+error }
            log.error(res)
            return json.dumps(res, separators=(',',':'))
    else :
        res = {"message": ACCESS_DENIED}
        log.error(res)
        return json.dumps(res, separators=(',',':'))
