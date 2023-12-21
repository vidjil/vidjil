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
from ..modules.zmodel_factory import ModelFactory
from ..VidjilAuth import VidjilAuth, PermissionLetterMapping
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
def add_default_group_permissions(auth, group_id, anon=False):
    auth.add_permission(group_id, PermissionEnum.create.value, 'sample_set', 0)
    auth.add_permission(group_id, PermissionEnum.read.value, 'sample_set', 0)
    auth.add_permission(group_id, PermissionEnum.admin.value, 'sample_set', 0)
    auth.add_permission(group_id, PermissionEnum.upload.value, 'sample_set', 0)
    auth.add_permission(group_id, PermissionEnum.save.value, 'sample_set', 0)
    if anon:
        auth.add_permission(group_id, PermissionEnum.anon.value, 'sample_set', 0)

ACCESS_DENIED = "access denied"



############################
# CONTROLLERS
############################
## return group list
@action("/vidjil/group/index", method=["POST", "GET"])
@action.uses("group/index.html", db, auth.user)
@vidjil_utils.jsontransformer
def index():
    count = db.auth_group.id.count()
    user_count = db.auth_user.id.count()
    query = db(
       (db.auth_group.id > 0) &
       (db.auth_membership.group_id == db.auth_group.id) &
       (db.auth_membership.user_id == db.auth_user.id)
    ).select(
            db.auth_group.role.with_alias('role'),
            db.auth_group.id.with_alias('id'),
            db.auth_group.description.with_alias('description'),
            user_count.with_alias('count'),
            groupby = db.auth_group.id,
            orderby=db.auth_group.role)

    for row in query:
        row.parents = ', '.join(str(value) for value in auth.get_group_parent(row.id))

        row.access = ''
        permissions_list = [PermissionEnum.create.value,
                            PermissionEnum.upload.value,
                            PermissionEnum.run.value,
                            PermissionEnum.anon.value,
                            PermissionEnum.admin.value,
                            PermissionEnum.save.value]
        permissions = auth.get_group_permissions(table_name='sample_set', group_id=row.id, myfilter=permissions_list)
        row.access = ''.join([PermissionLetterMapping[p].value for p in permissions])

    log.info("access group list", extra={'user_id': auth.user_id,
                'record_id': None,
                'table_name': "group"})

    return dict(message=T('Groups'), query=query, count=count, auth=auth, db=db)


## return an html form to add a group
@action("/vidjil/group/add", method=["POST", "GET"])
@action.uses("group/add.html", db, auth.user)
@vidjil_utils.jsontransformer
def add():
    if auth.is_admin():
        groups = db(db.auth_group).select()
    else:
        groups = auth.get_user_groups()

    log.info('access group add form', extra={'user_id': auth.user_id,
                'record_id': None,
                'table_name': "group"})
    return dict(message=T('New group'), groups=groups, auth=auth, db=db)


## create a group if the html form is complete
## need ["group_name", "info"]
## redirect to group list if success
## return a flash error message if error
@action("/vidjil/group/add_form", method=["POST", "GET"])
@action.uses(db, auth.user)
def add_form():
    if not auth.is_admin():
        return error_message(ACCESS_DENIED)

    error = ""

    if request.params["group_name"] == "" :
        error += "group name needed, "

    if error=="" :
        id = db.auth_group.insert(role=request.params["group_name"],
                               description=request.params["info"])
        user_group = auth.user_group(auth.user_id)

        #group creator is a group member
        auth.add_membership(id, auth.user_id)

        # Associate group with parent group network
        group_parent = request.params["group_parent"]
        if group_parent != None and group_parent != 'None':
            parent_list = db(db.group_assoc.second_group_id == group_parent).select(db.group_assoc.ALL)
            parent = None
            if len(parent_list) > 0:
                for parent in parent_list:
                    db.group_assoc.insert(first_group_id=parent.first_group_id, second_group_id=id)
                    auth.add_permission(parent.first_group_id, PermissionEnum.admin_group.value, db.auth_group, id)
            else:
                db.group_assoc.insert(first_group_id=group_parent, second_group_id=id)
                auth.add_permission(group_parent, PermissionEnum.admin_group.value, db.auth_group, id)
        else:
            auth.add_permission(id, PermissionEnum.admin_group.value, id)

        add_default_group_permissions(auth, id)

        res = {"redirect": "group/index",
               "group_id": id,
               "message" : "group '%s' (%s) created" % (id, request.params["group_name"])}

        log.info(res, extra={'user_id': auth.user_id,
                             'record_id': id,
                             'table_name': "group"})
        log.admin(res)
        return json.dumps(res, separators=(',',':'))

    else :
        res = {"success" : "false", "message" : error}
        log.error(res)
        return json.dumps(res, separators=(',',':'))

@action("/vidjil/group/edit", method=["POST", "GET"])
@action.uses("group/edit.html", db, auth.user)
@vidjil_utils.jsontransformer
def edit():
    if auth.is_admin() or auth.has_permission(PermissionEnum.admin.value, db.auth_group, request.query["id"]):
        group = db.auth_group[request.query["id"]]
        log.info('access group edit form', extra={'user_id': auth.user_id,
            'record_id': request.query["id"],
            'table_name': "group"})
        return dict(message=T('Edit group'), group=group, auth=auth, db=db)

    return error_message(ACCESS_DENIED)

@action("/vidjil/group/edit_form", method=["POST", "GET"])
@action.uses(db, auth.user)
def edit_form():
    if not auth.can_modify_group(int(request.params['id'])):
        return error_message(ACCESS_DENIED)

    error = ""

    if request.params["group_name"] == "" :
        error += "group name needed, "

    if error=="" :
        db(db.auth_group.id == request.params["id"]).update(role=request.params["group_name"],
                                                            description=request.params["info"])

        res = {"redirect": "group/index",
               "message" : "group '%s' modified" % request.params["id"]}

        log.info(res, extra={'user_id': auth.user_id,
                'record_id': request.params['id'],
                'table_name': "group"})
        log.admin(res)
        return json.dumps(res, separators=(',',':'))

    else :
        res = {"success" : "false", "message" : error}
        log.error(res)
        return json.dumps(res, separators=(',',':'))

## confirm page before group deletion
## need ["id"]
@action("/vidjil/group/confirm", method=["POST", "GET"])
@action.uses("group/confirm.html", db, auth.user)
@vidjil_utils.jsontransformer
def confirm():
    if auth.can_modify_group(int(request.query["id"])):
        return dict(message=T('confirm group deletion'), auth=auth, db=db)
    return error_message(ACCESS_DENIED)


## delete group
## need ["id"]
## redirect to group list if success
@action("/vidjil/group/delete", method=["POST", "GET"])
@action.uses(db, auth.user)
def delete():
    if not auth.can_modify_group(int(request.query["id"])):
        return error_message(ACCESS_DENIED)
    #delete group
    db(db.auth_group.id == request.query["id"]).delete()
    
    res = {"redirect": "group/index",
           "message": "group '%s' deleted" % request.query["id"]}
    log.info(res, extra={'user_id': auth.user_id,
                'record_id': request.query["id"],
                'table_name': "group"})
    log.admin(res)
    return json.dumps(res, separators=(',',':'))


## return list of group member
## need ["id"]
@action("/vidjil/group/info", method=["POST", "GET"])
@action.uses("group/info.html", db, auth.user)
@vidjil_utils.jsontransformer
def info():
    if auth.can_view_group(int(request.query["id"])):
        log.info("access user list", extra={'user_id': auth.user_id,
                'record_id': request.query["id"],
                'table_name': "group"})

        group = db.auth_group[request.query["id"]]

        base_query = ((db.auth_user.id == db.auth_membership.user_id)
                & (db.auth_membership.group_id == request.query["id"]))

        parent_group = db(db.group_assoc.second_group_id == request.query["id"]).select()

        group_ids = [request.query["id"]] + [r.first_group_id for r in parent_group]

        base_left = [db.auth_permission.on(
                        (db.auth_permission.group_id.belongs(group_ids)) &
                        (db.auth_permission.name == 'access') &
                        (db.auth_permission.table_name == 'sample_set') &
                        (db.auth_permission.record_id > 0)),
                    db.sample_set_membership.on(
                        db.sample_set_membership.sample_set_id == db.auth_permission.record_id)]

        query = db(base_query).select(
                db.auth_user.id,
                db.auth_user.first_name,
                db.auth_user.last_name,
                db.auth_user.email,
                db.sequence_file.id.count(True).with_alias('file_count'),
                db.sequence_file.size_file.coalesce_zero().sum().with_alias('size'),
                left=base_left + [db.sequence_file.on(
                        (db.sequence_file.provider == db.auth_user.id) &
                        (db.sequence_file.id == db.sample_set_membership.sequence_file_id))
                ],
                groupby=(db.auth_user.id)
            )

        sset_count = db(base_query).select(
                db.auth_user.id,
                db.patient.id.count(True).with_alias('patient_count'),
                db.run.id.count(True).with_alias('run_count'),
                db.generic.id.count(True).with_alias('generic_count'),
                left=base_left + [db.patient.on(
                        (db.patient.creator == db.auth_user.id) &
                        (db.patient.sample_set_id == db.sample_set_membership.sample_set_id)),
                    db.run.on(
                        (db.run.creator == db.auth_user.id) &
                        (db.run.sample_set_id == db.sample_set_membership.sample_set_id)),
                    db.generic.on(
                        (db.generic.creator == db.auth_user.id) &
                        (db.generic.sample_set_id == db.sample_set_membership.sample_set_id))
                ],
                groupby=(db.auth_user.id)
            )

        logins = db(base_query).select(
                db.auth_user.id,
                db.auth_event.time_stamp.max().with_alias('last_login'),
                left=[db.auth_event.on(
                    (db.auth_event.user_id == db.auth_user.id) &
                    (db.auth_event.origin == 'auth') &
                    (db.auth_event.description.like('%Logged-in')))
                ],
                groupby=(db.auth_user.id, db.auth_event.description)
            )

        result = {}
        for row in query:
            result[row.auth_user.id] = row

        for row in sset_count:
            result[row.auth_user.id]['count'] = row.patient_count + row.run_count + row.generic_count

        for row in logins:
            result[row.auth_user.id]['last_login'] = row.last_login

        return dict(message=T('group info'),
                    result=result,
                    group=group,
                    auth=auth,
                    db=db)
    return error_message(ACCESS_DENIED)
    
## invite an user to join the group
## need ["group_id", "user_id"]
@action("/vidjil/group/invite", method=["POST", "GET"])
@action.uses(db, auth.user)
def invite():
    #check admin 
    if auth.can_modify_group(int(request.query["group_id"])):
        auth.add_membership(request.query["group_id"], request.query["user_id"])
        res = {"redirect" : "group/info" ,
               "args" : { "id" : request.query["group_id"]},
               "message" : "user '%s' added to group '%s'" % (request.query["user_id"], request.query["group_id"])}
        log.admin(res)
        log.info(res, extra={'user_id': auth.user_id,
                'record_id': request.query["group_id"],
                'table_name': "group"})
        return json.dumps(res, separators=(',',':'))

    else:
        res = {"redirect" : "group/info" ,
               "args" : { "id" : request.query["group_id"]},
               "message" : "you don't have permission to invite people"}
        log.error(res)
        return json.dumps(res, separators=(',',':'))
        
## revoke membership
## need ["group_id", "user_id"]
@action("/vidjil/group/kick", method=["POST", "GET"])
@action.uses(db, auth.user)
def kick():
    #check admin 
    if auth.can_modify_group(int(request.query["group_id"])):
        auth.del_membership(request.query["group_id"], request.query["user_id"])
        res = {"redirect" : "group/info" ,
               "args" : { "id" : request.query["group_id"]},
               "message" : "user '%s' removed from group '%s'" % (request.query["user_id"], request.query["group_id"])}
        log.admin(res)
        log.info(res, extra={'user_id': auth.user_id,
                'record_id': request.query["group_id"],
                'table_name': "group"})
        return json.dumps(res, separators=(',',':'))

    else:
        res = {"redirect" : "group/info" ,
               "args" : { "id" : request.query["group_id"]},
               "message" : "you don't have permission to kick people"}
        log.error(res)
        return json.dumps(res, separators=(',',':'))

@action("/vidjil/group/rights", method=["POST", "GET"])
@action.uses(db, auth.user)
def rights():
    if auth.is_admin():
        group_id = request.query["id"]

        if request.query["value"] == "true" :
            auth.add_permission(group_id, request.query["right"], request.query["name"], 0)
            msg = "add '" + request.query["right"] + "' permission on '" + request.query["name"] + "' for group " + db.auth_group[group_id].role
        else :
            auth.del_permission(group_id, request.query["right"], request.query["name"], 0)
            msg = "remove '" + request.query["right"] + "' permission on '" + request.query["name"] + "' for group " + db.auth_group[group_id].role

        res = { "redirect": "group/info",
                "args" : {"id" : group_id },
                "message": msg}
        log.admin(json.dumps(res))
        log.info(res, extra={'user_id': auth.user_id,
                'record_id': request.query["id"],
                'table_name': "group"})
        return json.dumps(res, separators=(',',':'))
    else :
        res = {"message": "admin only"}
        log.error(res)
        return json.dumps(res, separators=(',',':'))
