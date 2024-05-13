# -*- coding: utf-8 -*-
import base64
import datetime
from sys import modules


from .. import defs
from ..modules import vidjil_utils
from ..modules import tag
from ..modules.stats_decorator import *
from ..modules.sampleSet import SampleSet, get_set_group
from ..modules.sampleSets import SampleSets
from ..modules.sampleSetList import SampleSetList, filter_by_tags
from ..modules.sequenceFile import check_space, get_sequence_file_sample_sets, get_sequence_file_config_ids
from ..modules.controller_utils import error_message
from ..modules.permission_enum import PermissionEnum
from ..modules.zmodel_factory import ModelFactory
from ..tasks import schedule_pre_process, get_preprocessed_filename, get_original_filename
from ..user_groups import get_upload_group_ids, get_involved_groups
from ..VidjilAuth import VidjilAuth
from io import StringIO
import json
import time
import os
from py4web import action, request, abort, redirect, URL, Field, HTTP, response
from collections import defaultdict
import math

from ..common import db, session, T, flash, cache, authenticated, unauthenticated, auth, log, scheduler


###########################
# HELPERS
###########################
    
ACCESS_DENIED = "access denied"


@action("/vidjil/pre_process/index", method=["POST", "GET"])
@action.uses("pre_process/index.html", db, auth.user)
@vidjil_utils.jsontransformer
def index():
    if not auth.is_admin():
        res = {"success" : "false",
               "message" : ACCESS_DENIED,
               "redirect" : URL('sample_set', 'all', vars={'type': defs.SET_TYPE_PATIENT, 'page': 0}, scheme=True)}
        log.info(res)
        return json.dumps(res, separators=(',',':'))

    query = db((auth.vidjil_accessible_query(PermissionEnum.read_pre_process.value, db.pre_process) | auth.vidjil_accessible_query(PermissionEnum.admin_pre_process.value, db.pre_process) ) ).select(orderby=~db.pre_process.name)
    log.info("view pre process list", extra={'user_id': auth.user_id,
                'record_id': None,
                'table_name': "pre_process"})

    return dict(message=T('Pre-process list'),
               query=query,
               isAdmin = auth.is_admin(),
               auth=auth,
               db=db)

@scheduler.task
@action("/vidjil/pre_process/task", method=["POST", "GET"])
@action.uses(db, auth.user)
def task_test2():
    try:
        db._adapter.reconnect()
        db.patient[28815].update_record( info = db.patient[28815]['info']+"z")
        print('POUET')
        db.commit()
    except:
        print('FAIL')
        db.rollback()

@action("/vidjil/pre_process/add", method=["POST", "GET"])
@action.uses("pre_process/add.html", db, auth.user)
@vidjil_utils.jsontransformer
def add():
    if auth.can_create_pre_process():
        return dict(message=T('Add pre-process'), auth=auth, db=db)
    return error_message(ACCESS_DENIED)


@action("/vidjil/pre_process/add_form", method=["POST", "GET"])
@action.uses(db, auth.user)
def add_form():
    if not auth.can_create_pre_process():
        return error_message(ACCESS_DENIED)
    error =""

    required_fields = ['pre_process_name', 'pre_process_command']
    for field in required_fields:
        if request.params[field] == "" :
            error += field+" needed, "

    if error=="" :
        
        pre_process_id = db.pre_process.insert(name=request.params['pre_process_name'],
                        info=request.params['pre_process_info'],
                        command=request.params['pre_process_command']
                        )

        auth.add_permission(auth.user_group(), PermissionEnum.read_pre_process.value, db.pre_process, pre_process_id)

        res = {"redirect": "pre_process/index",
               "message": "pre_process '%s' added" % request.params['pre_process_name'],
               "pre_process_id": pre_process_id}
        log.admin(res)
        log.info(res, extra={'user_id': auth.user_id,
                'record_id': pre_process_id,
                'table_name': "pre_process"})
        return json.dumps(res, separators=(',',':'))
        
    else :
        res = {"success" : "false", "message" : error}
        log.error(res)
        return json.dumps(res, separators=(',',':'))

@action("/vidjil/pre_process/edit", method=["POST", "GET"])
@action.uses("pre_process/edit.html", db, auth.user)
@vidjil_utils.jsontransformer
def edit(): 
    if auth.can_modify_pre_process(int(request.query['id'])):
        return dict(message=T('edit pre_process'), 
                    info = db.pre_process[request.query["id"]],
                    auth=auth,
                    db=db)
    return error_message(ACCESS_DENIED)

@action("/vidjil/pre_process/edit_form", method=["POST", "GET"])
@action.uses(db, auth.user)
def edit_form(): 
    if not auth.can_modify_pre_process(int(request.params['id'])):
        return error_message(ACCESS_DENIED)
    error =""

    required_fields = ['pre_process_name', 'pre_process_command']
    for field in required_fields:
        if request.params[field] == "" :
            error += field+" needed, "

    if error=="" :

        db.pre_process[request.params["id"]] = dict(name=request.params['pre_process_name'],
                        info=request.params['pre_process_info'],
                        command=request.params['pre_process_command']
                        )

        res = {"redirect": "pre_process/index",
               "message": "pre_process '%s' updated" % request.params['pre_process_name']}

        log.admin(res)
        log.info(res, extra={'user_id': auth.user_id,
                'record_id': request.params["id"],
                'table_name': "pre_process"})
        return json.dumps(res, separators=(',',':'))

    else :
        res = {"success" : "false", "message" : error}
        log.error(res)
        return json.dumps(res, separators=(',',':'))

@action("/vidjil/pre_process/confirm", method=["POST", "GET"])
@action.uses("pre_process/confirm.html",db, auth.user)
@vidjil_utils.jsontransformer
def confirm():
    if auth.can_modify_pre_process(int(request.query['id'])):
        query = db( (db.pre_process.id == request.query['id']) & (auth.vidjil_accessible_query(PermissionEnum.read_pre_process.value, db.pre_process) | auth.vidjil_accessible_query(PermissionEnum.admin_pre_process.value, db.pre_process) )  ).select()
        return dict(message=T('confirm pre_process deletion'), query=query, auth=auth,db=db)
    return error_message(ACCESS_DENIED)


@action("/vidjil/pre_process/delete", method=["POST", "GET"])
@action.uses(db, auth.user)
def delete():
    
    if not auth.can_modify_pre_process(int(request.query['id'])):
        return error_message(ACCESS_DENIED)
    #delete pre_process
    db(db.pre_process.id==request.query["id"]).delete() 
    
    res = {"redirect": "pre_process/index",
           "message": "pre_process '%s' deleted" % request.query["id"]}
    log.admin(res)
    log.info(res, extra={'user_id': auth.user_id,
            'record_id': request.query["id"],
            'table_name': "pre_process"})
    return json.dumps(res, separators=(',',':'))


## need ["sample_set_id"]
@action("/vidjil/pre_process/info", method=["POST", "GET"])
@action.uses("pre_process/info.html",db, auth.user)
@vidjil_utils.jsontransformer
def info():
    if (auth.can_modify_sample_set(int(request.query["sample_set_id"]))):
        log.info("view pre process info", extra={'user_id': auth.user_id,
                'record_id': request.query["sample_set_id"],
                'table_name': "sample_set_id"})
        sequence_file_id = request.query["sequence_file_id"]
        sequence_file = db.sequence_file[sequence_file_id]
        run = db(db.scheduler_task.id == sequence_file.pre_process_scheduler_task_id).select(db.scheduler_task.ALL).first()

        content = None
        out_folder = defs.DIR_PRE_VIDJIL_ID % int(sequence_file_id)
        for filepath in os.listdir(out_folder+"/"):
            if ".pre.log" in filepath:
                if os.path.exists(f"{out_folder+'/'+filepath}"):
                    with open(f"{out_folder+'/'+filepath}", 'r', encoding='utf-8') as f:
                        content = f.read()

        return dict(message=T('result info'),
            auth=auth, db=db,
            sequence_file_id=sequence_file_id,
            sequence_file=sequence_file,
            run=run,
            content_log=content
        )
    else :
        res = {"message": "acces denied"}
        return json.dumps(res, separators=(',',':'))


@action("/vidjil/pre_process/permission", method=["POST", "GET"])
@action.uses("pre_process/permission.html",db, auth.user)
@vidjil_utils.jsontransformer
def permission():
    if (not auth.can_modify_pre_process(int(request.query["id"])) ):
        res = {"message": ACCESS_DENIED}
        log.error(res)
        return json.dumps(res, separators=(',',':'))

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

        row.parent_access = ', '.join(str(value) for value in auth.get_access_groups(db.pre_process, request.query['id'], group=row.id))
        row.read =  auth.get_group_access('pre_process', request.query['id'], row.id)

    return dict(query = query, auth=auth,db=db)

@action("/vidjil/pre_process/change_permission", method=["POST", "GET"])
@action.uses(db, auth.user)
def change_permission():
    if (not auth.can_modify_pre_process(int(request.query["pre_process_id"])) ):
        res = {"message": ACCESS_DENIED}
        log.error(res)
        return json.dumps(res, separators=(',',':'))

    error = ""
    if request.query["group_id"] == "" :
        error += "missing group_id, "
    if request.query["pre_process_id"] == "" :
        error += "missing pre_process_id, "

    if error=="":
        if auth.get_group_access(db.pre_process, int(request.query["pre_process_id"]), int(request.query["group_id"])):
            auth.del_permission(request.query["group_id"], PermissionEnum.access.value, db.pre_process, request.query["pre_process_id"])
            res = {"message" : "c%s: access '%s' deleted to '%s'" % (request.query["pre_process_id"],
                                                                     PermissionEnum.access.value, db.auth_group[request.query["group_id"]].role)}
        else :
            auth.add_permission(request.query["group_id"], PermissionEnum.access.value, db.pre_process, request.query["pre_process_id"])
            res = {"message" : "c%s: access '%s' granted to '%s'" % (request.query["pre_process_id"],
                                                                     PermissionEnum.access.value, db.auth_group[request.query["group_id"]].role)}

        log.admin(res)
        log.info(res, extra={'user_id': auth.user_id,
                'record_id': request.query["pre_process_id"],
                'table_name': "pre_process"})
        return json.dumps(res, separators=(',',':'))
    else :
        res = {"message": "incomplete request : "+error }
        log.error(res)
        return json.dumps(res, separators=(',',':'))
