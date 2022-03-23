import os
from py4web import action, request, abort, redirect, URL, Field, HTTP
from yatl.helpers import A, I
from py4web.utils.form import Form, FormStyleDefault
from py4web.utils.grid import Grid, GridClassStyle, Column
from py4web.utils.publisher import Publisher, ALLOW_ALL_POLICY
from pydal.validators import IS_NOT_EMPTY, IS_INT_IN_RANGE, IS_IN_SET, IS_IN_DB
from yatl.helpers import INPUT, H1, HTML, BODY, A, DIV
from py4web.utils.param import Param
from ..settings import SESSION_SECRET_KEY
from ..modules.permission_enum import PermissionEnum
from ..user_groups import get_default_creation_group
from ..VidjilAuth import VidjilAuth
import types

from ..common import db, session, T, flash, cache, authenticated, unauthenticated, auth

# exposes services necessary to access the db.thing via ajax
publisher = Publisher(db, policy=ALLOW_ALL_POLICY)

@action("run/list")
@action.uses("index.html", auth)
def index():
    return {}

@action("run", method=["POST", "GET"])
@action.uses("html_grid.html",session, db, auth, T)
@action.uses(auth.user)
def run_grid(path=None):

    grid_param = dict(
        rows_per_page=20,
        include_action_button_text=True,
        search_button_text="Filter",
        formstyle=FormStyleDefault,
        grid_class_style=GridClassStyle)
                               
    search_queries = [
        ['By Name', lambda value: db.run.name.contains(value)],
        ['By Creator', lambda value: db.auth_user.last_name.contains(value)],
    ]

    query = (auth.vidjil_accessible_query('access', db.run))

    orderby = [~db.run.id]
    columns = [field for field in db.run if field.readable]
    columns = [
        db.run.id,
        db.run.name,
        db.run.run_date,
        db.run.creator
    ]

    grid = Grid(path,
                query,
                left = [],
                create='/vidjil/run/create',
                editable='/vidjil/run/update',
                deletable='/vidjil/run/delete',
                columns=columns,
                search_queries=search_queries,
                orderby=orderby,
                show_id=True,
                T=T,
                **grid_param)

    return dict(grid=grid,
                title="Run List")



@action("/vidjil/run/create", method=["POST", "GET"])
@action.uses(db, "forms.html")
@action.uses(auth.user)
def run_create(id=None):

    # find user groups
    groups = get_default_creation_group(auth)[0]
    group_set = []
    for g in groups:
        group_set.append(g['name'])


    form = Form([
        Field('owner_group', requires=IS_IN_SET(group_set)),
        Field('id_label','string'),
        Field('name', 'string', requires=IS_NOT_EMPTY()),
        Field('run_date','date'),
        Field('info','text'),
        ])

    if form.accepted:
        # create a sample_set_id for this run
        id_sample_set = db.sample_set.insert(sample_type='run')

        #insert new run in db
        id_run = db.run.insert(         name = form.vars['name'],
                                        id_label = form.vars['id_label'],
                                        run_date = form.vars['run_date'],
                                        info = form.vars['info'],
                                        sample_set_id = id_sample_set,
                                        creator = auth.user_id )

        # set permission to owner group
        groups = get_default_creation_group(auth)[0]
        group_id = 0
        for g in groups:
            if g['name'] == form.vars['owner_group'] :
                group_id = g['id']
        auth.add_permission(group_id, PermissionEnum.access.value, 'sample_set', id_sample_set)

        redirect(URL('/vidjil/run'))

    return dict(title="create run",
                forms=[form])


@action("/vidjil/run/update/<id:int>", method=["POST", "GET"])
@action.uses(db, "forms.html")
@action.uses(auth.user)
def run_update(id=None):

    # run to edit 
    run = db.run[id]
    sample_set = db.sample_set[run['sample_set_id']]

    # find existing run owner group
    group = None
    perms = db((db.auth_permission.record_id == sample_set.id) &
                (db.auth_permission.table_name == 'sample_set') &
                (db.auth_permission.name == PermissionEnum.access.value)
            ).select(db.auth_permission.id, db.auth_permission.group_id)
    for p in perms :
        group = db.auth_group[p.group_id]

    # find user groups
    groups = get_default_creation_group(auth)[0]
    group_set = []
    for g in groups:
        group_set.append(g['name'])
    
    form = Form([
        Field('owner_group', default=group['role'],requires=IS_IN_SET(group_set)),
        Field('id_label', 'string', default=run['id_label']),
        Field('name', 'string', default=run['name'], requires=IS_NOT_EMPTY()),
        Field('run_date','date', default=run['run_date']),
        Field('info','text'),
        ])

    if form.accepted:
        #update run in db
        db.run[id].update_record(   name = form.vars['name'],
                                    id_label = form.vars['id_label'],
                                    run_date = form.vars['run_date'],
                                    info = form.vars['info'])

        # delete existing owner group
        for p in perms :
            perm = db.auth_permission[p.id]
            perm.delete_record()

        # set permission to new owner group
        groups = get_default_creation_group(auth)[0]
        group_id = 0
        for g in groups:
            if g['name'] == form.vars['owner_group'] :
                group_id = g['id']
        auth.add_permission(group_id, PermissionEnum.access.value, 'sample_set', db.run[id].sample_set_id)

        redirect(URL('/vidjil/run'))

    return dict(title="edit run",
                forms=[form])


@action("/vidjil/run/delete/<id:int>", method=["POST", "GET"])
@action.uses(db, auth.user)
def run_delete(id=None):
    # delete run
    run = db.run[id]
    sample_set = db.sample_set[run['sample_set_id']]
    run.delete_record()

    # delete group permission
    perms = db((db.auth_permission.record_id == sample_set.id) &
            (db.auth_permission.table_name == 'run') &
            (db.auth_permission.name == PermissionEnum.access.value)
        ).select(db.auth_permission.id, db.auth_permission.group_id)
    for p in perms :
        db.auth_permission[p.id].delete_record()

    # delete sample_set 
    sample_set.delete_record() 
        
    redirect(URL('/vidjil/run'))