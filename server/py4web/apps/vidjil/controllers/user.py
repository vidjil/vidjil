# -*- coding: utf-8 -*-
from sys import modules
from .. import defs
from ..modules import vidjil_utils
from ..modules import tag
from ..modules.stats_decorator import *
from ..modules.controller_utils import error_message
from ..modules.permission_enum import PermissionEnum
import json
import re
from py4web import action, request, abort, redirect, URL, Field, HTTP, response
from collections import defaultdict
import datetime
from datetime import timedelta 

from ..common import db, session, T, flash, cache, authenticated, unauthenticated, auth, log


##################################
# HELPERS
##################################

ACCESS_DENIED = "access denied"
        
## return user list
@action("/vidjil/user/index", method=["POST", "GET"])
@action.uses("user/index.html", db, auth.user)
@vidjil_utils.jsontransformer
def index():
    
    since = datetime.datetime.now() - timedelta(days=90)

    query = db(db.auth_user).select()

    groups =  {g.id: {'id': g.id, 'role': g.role, 'description': g.description} for g in db(db.auth_group.id).select()}
    for row in query :
        row.created = db( db.patient.creator == row.id ).count()
        
        row.access = ''
        if auth.can_create_patient(user=row.id): row.access += 'c'

        q = [g.group_id for g in db(db.auth_membership.user_id==row.id).select()]
        q.sort()
        row.groups = q

        row.size = 0
        row.files = 0
        query_size = db( db.sequence_file.provider == row.id ).select()
        
        for row2 in query_size:
            row.files += 1
            row.size += row2.size_file

        last_logins = db((db.auth_event.user_id==row.id)
                        &(db.auth_event.description=='User ' + str(row.id) + ' Logged-in')
                        &(db.auth_event.origin=='auth')).select(db.auth_event.time_stamp,
                                                                orderby=~db.auth_event.time_stamp)
        
        row.first_login = str(last_logins[-1].time_stamp) if len(last_logins) > 0 else '-'
        row.last_login = str(last_logins[0].time_stamp) if len(last_logins) > 0 else '-'
        # login status between never ('-'), recent (True) and old (False)
        row.login_status =  datetime.datetime.strptime(row.last_login, '%Y-%m-%d %H:%M:%S') > since if row.last_login != "-" else "-"

    ##sort query
    reverse = False
    if "reverse" in request.query and request.query["reverse"] == "true" :
        reverse = True
    if not "sort" in request.query :
        request.query["sort"] = ""
    
    if request.query["sort"] == "files" :
        query = sorted(query, key = lambda row : row.size, reverse=reverse)
    elif request.query["sort"] == "patients" :
        query = sorted(query, key = lambda row : row.created, reverse=reverse)
    elif request.query["sort"] == "login" :
        query = sorted(query, key = lambda row : row.last_login, reverse=reverse)
    else:
        query = sorted(query, key = lambda row : row.id, reverse=False)

    log.info("view user list", extra={'user_id': auth.user_id, 'record_id': None, 'table_name': 'auth_user'})
    return dict(query=query,
                groups=groups,
                reverse=reverse,
                auth=auth,
                db=db)

@action("/vidjil/user/edit", method=["POST", "GET"])
@action.uses("user/edit.html", db, auth.user)
@vidjil_utils.jsontransformer
def edit():
    if auth.can_modify_user(int(request.query['id'])):
        user = db.auth_user[request.query["id"]]
        log.info("load edit form for user",
                extra={'user_id': auth.user_id, 'record_id': request.query['id'], 'table_name': 'auth_user'})
        return dict(message=T("Edit user"), user=user, auth=auth, db=db)
    return error_message(ACCESS_DENIED)

@action("/vidjil/user/edit_form", method=["POST", "GET"])
@action.uses(db, auth.user)
def edit_form():
    if not auth.can_modify_user(int(request.params['id'])):
        res = {"message": ACCESS_DENIED}
        log.error(res)
        return json.dumps(res, separators=(',',':'))

    if request.params["confirm_password"] != request.params["password"]:
        res = {"success": "false", "message": "password fields must match"}
        log.error(res)
        return json.dumps(res, separators=(',', ':'))

    updated_user = dict(first_name = request.params["first_name"],
                        last_name = request.params["last_name"],
                        email = request.params["email"])
    if request.params["password"] != "":
        updated_user["password"] = request.params["password"] 
    log.debug(f"updated_user : {updated_user}")
    response = db(db.auth_user.id == request.params['id']).validate_and_update(**updated_user)
    errors = response.get("errors")
    if errors:
        res = {"success": "false", "message": json.dumps(errors)}
        log.error(res)
        return json.dumps(res, separators=(',', ':'))
    
    res = {"redirect": "back",
            "message": "%s (%s) user edited" % (request.params["email"], request.params["id"])}
    log.info(res,
        extra={'user_id': auth.user_id, 'record_id': request.params['id'], 'table_name': 'auth_user'})
    return json.dumps(res, separators=(',',':'))

## return user information
## need ["id"]
@action("/vidjil/user/info", method=["POST", "GET"])
@action.uses("user/info.html", db, auth.user)
@vidjil_utils.jsontransformer
def info():
    if "id" not in request.query:
        request.query["id"] = db().select(db.auth_user.ALL, orderby=~db.auth_user.id)[0].id
    log.info("view info for user (%d)" % int(request.query['id']),
            extra={'user_id': auth.user_id, 'record_id': request.query['id'], 'table_name': 'auth_user'})
    return dict(message=T('user info'), auth=auth, db=db)
