'''
Returns messages previouly logged within the 'user_log' table.
See UserLogHandler() in models/db.py.
'''

# -*- coding: utf-8 -*-
from sys import modules
from .. import defs
from ..modules import vidjil_utils
from ..modules import tag
from ..modules.stats_decorator import *
from ..modules.permission_enum import PermissionEnum
from ..VidjilAuth import VidjilAuth
from io import StringIO
import json
from py4web import action, request, abort, redirect, URL, Field, HTTP, response
from collections import defaultdict

from ..common import db, session, T, flash, cache, authenticated, unauthenticated, auth, log


##################################
# HELPERS
##################################

ACCESS_DENIED = "access denied"

def anon_names(data):
    for row in data:
        # TODO use helper ?
        row.name = vidjil_utils.anon_ids([row.id])[0]
    return data

def get_data_list(table):
    data = db(auth.vidjil_accessible_query(PermissionEnum.read.value, table)).select()

    if table == 'patient':
        data = anon_names(data)
    data_list = [(row.id, row.name) for row in data]
    data_list.sort(key=lambda tup: tup[1])
    return data_list



##################################
# CONTROLLERS
##################################
@action("/vidjil/log/index", method=["POST", "GET"])
@action.uses("log/index.html", db, auth.user)
def index():
    if not auth.user:
        res = {"redirect" : URL('default', 'user', args='login', scheme=True,
                            vars=dict(_next=URL('patient', 'index', scheme=True)))
            }

        return json.dumps(res, separators=(',',':'))

    user_log = db.user_log
    data_list = []
    groups = []
    table_name = 'all'
    id_value = 0

    auth.load_permissions(PermissionEnum.anon.value, 'patient')
    if auth.is_admin():
        query = (user_log.id > 0)
    else:
        user_groups = auth.get_user_groups()
        parent_groups = auth.get_user_group_parents()
        group_list = [g.id for g in user_groups]
        public_id = vidjil_utils.getPublicGroupId(db)
        if vidjil_utils.publicGroupIsInList(db, group_list): # Remove logs on  public group
            group_list.remove(public_id)
        parent_list = [g.id for g in parent_groups]

        groups = list(set(group_list + parent_list))
        query = ((user_log.table_name == db.auth_permission.table_name) &
            (user_log.record_id == db.auth_permission.record_id) &
            (db.auth_permission.name == PermissionEnum.access.value) &
            (db.auth_permission.group_id.belongs(groups))
            )

    if 'table' in request.query and request.query['table'] != 'all':
        table_name = request.query['table']
        table = db[table_name]
        query &= user_log.table_name == table_name
        data_list = get_data_list(table_name)

    if 'id' in request.query and request.query['id'] != 0:
        id_value = request.query['id']
        query &= user_log.record_id == request.query['id']

    if 'table' in request.query and 'id' in request.query :
        query &= (db.auth_user.id == user_log.user_id)
        query = db(query).select(user_log.ALL, db.auth_user.first_name, db.auth_user.last_name, db.patient.first_name, db.patient.last_name, db.run.name,
                left = [
                    db.patient.on((db.patient.id == db.user_log.record_id) & (db.user_log.table_name == 'patient')),
                    db.run.on((db.run.id == db.user_log.record_id) & (db.user_log.table_name == 'run'))
                ],
                orderby=~db.user_log.created)
        for row in query:
            if row.patient.first_name is not None:
                row.names = vidjil_utils.anon_ids([row.user_log.record_id])[0]
            else:
                row.names = row.run.name
    else :
        query =[]

    return dict(query=query,
                data_list=data_list,
                stable=table_name,
                sid=id_value,
                auth=auth,
                db=db)
