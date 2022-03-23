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

@action("patient", method=["POST", "GET"])
@action.uses("html_grid.html",session, db, auth, T)
@action.uses(auth.user)
def patient_grid(path=None):

    test = types.SimpleNamespace()
    test.flash = None

    if test.flash:
        test.flash = "hello"

    grid_param = dict(
        rows_per_page=20,
        include_action_button_text=True,
        search_button_text="Filter",
        formstyle=FormStyleDefault,
        grid_class_style=GridClassStyle)
                               
    search_queries = [
        ['By Name', lambda value: db.patient.first_name.contains(value)],
        ['By Creator', lambda value: db.auth_user.last_name.contains(value)],
    ]

    query = (auth.vidjil_accessible_query('access', db.patient))

    column_name = Column("name", lambda row: f"{row.first_name[:3]} {row.last_name[:3]}")
    if auth.can_view_info('sample_set', 0):
        column_name = Column("name", lambda row: f"{row.first_name} {row.last_name}" )

    orderby = [~db.patient.id]
    columns = [field for field in db.patient if field.readable]
    columns = [
        db.patient.id,
        column_name,
        db.patient.birth,
        db.patient.info,
        db.patient.creator,
    ]

    grid = Grid(path,
                query,
                left = [
                #        db.sample_set_membership.on(s_table.sample_set_id == db.sample_set_membership.sample_set_id),
                #        db.sequence_file.on(db.sample_set_membership.sequence_file_id == db.sequence_file.id),
                #        db.fused_file.on(s_table.sample_set_id == db.fused_file.sample_set_id),
                #        db.config.on(db.fused_file.config_id == db.config.id),
                #        db.auth_permission.with_alias('generic_perm').on(
                #            (db.generic_perm.table_name == 'sample_set') &
                #            (db.generic_perm.record_id == s_table.sample_set_id) &
                #            (db.generic_perm.name == PermissionEnum.access.value)),
                #        db.auth_group.on(db.generic_perm.group_id == db.auth_group.id),
                #        db.auth_membership.on(db.auth_group.id == db.auth_membership.group_id),
                #        db.auth_user.on(db.auth_user.id == s_table.creator)
                ],
                create='/vidjil/patient/create',
                editable='/vidjil/patient/update',
                deletable='/vidjil/patient/delete',
                details='/vidjil/patient',
                columns=columns,
                search_queries=search_queries,
                orderby=orderby,
                show_id=True,
                T=T,
                **grid_param)

    #grid.formatters['thing.color'] = lambda color: I(_class="fa fa-circle", _style="color:"+color)

    return dict(grid=grid,
                title="Patient List")



@action("/vidjil/patient/create", method=["POST", "GET"])
@action.uses(db, "forms.html")
@action.uses(auth.user)
def patient_create(id=None):

    # find user groups
    groups = get_default_creation_group(auth)[0]
    group_set = []
    for g in groups:
        group_set.append(g['name'])


    form = Form([
        Field('owner_group', requires=IS_IN_SET(group_set)),
        Field('first_name','string', requires=IS_NOT_EMPTY()),
        Field('last_name','string', requires=IS_NOT_EMPTY()),
        Field('birth','date', requires=IS_NOT_EMPTY()),
        Field('info','text'),
        ])

    if form.accepted:
        # create a sample_set_id for this patient
        id_sample_set = db.sample_set.insert(sample_type='patient')

        #insert new patient in db
        id_patient = db.patient.insert( first_name = form.vars['first_name'],
                                        last_name = form.vars['last_name'],
                                        birth = form.vars['birth'],
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

        redirect(URL('/vidjil/patient'))

    return dict(title="create patient",
                forms=[form])


@action("/vidjil/patient/update/<id:int>", method=["POST", "GET"])
@action.uses(db, "forms.html")
@action.uses(auth.user)
def patient_update(id=None):

    # patient to edit 
    patient = db.patient[id]
    sample_set = db.sample_set[patient['sample_set_id']]

    # find existing patient owner group
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
        Field('owner_group', default=group['role'], requires=IS_IN_SET(group_set)),
        Field('first_name','string', default=patient['first_name'], requires=IS_NOT_EMPTY()),
        Field('last_name','string', default=patient['last_name'], requires=IS_NOT_EMPTY()),
        Field('birth','date', default=patient['birth'], requires=IS_NOT_EMPTY()),
        Field('info','text', default=patient['info']),
        ])

    if form.accepted:
        #update patient in db
        db.patient[id].update_record(   first_name = form.vars['first_name'],
                                        last_name = form.vars['last_name'],
                                        birth = form.vars['birth'],
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
        auth.add_permission(group_id, PermissionEnum.access.value, 'sample_set', db.patient[id].sample_set_id)

        redirect(URL('/vidjil/patient'))

    return dict(title="edit patient",
                forms=[form])


@action("/vidjil/patient/delete/<id:int>", method=["POST", "GET"])
@action.uses(db, auth.user)
def patient_delete(id=None):
    # patient to edit 
    patient = db.patient[id]
    sample_set = db.sample_set[patient['sample_set_id']]
    db.patient[id].delete_record()

    # delete existing owner group
    perms = db((db.auth_permission.record_id == sample_set.id) &
            (db.auth_permission.table_name == 'sample_set') &
            (db.auth_permission.name == PermissionEnum.access.value)
        ).select(db.auth_permission.id, db.auth_permission.group_id)
    for p in perms :
        db.auth_permission[p.id].delete_record()

    # delete sample_set 
    sample_set.delete_record() 
        
    redirect(URL('/vidjil/patient'))



@action("/vidjil/patient/<id:int>", method=["POST", "GET"])
@action.uses("html_grid.html",session, db, auth, T)
@action.uses(auth.user)
def patient(id=None):
    path=None
    grid_param = dict(
        rows_per_page=20,
        include_action_button_text=True,
        search_button_text="Filter",
        formstyle=FormStyleDefault,
        grid_class_style=GridClassStyle)
                               
    search_queries = [
    ]

    patient = db.patient[id]
    sample_set = db.sample_set[patient['sample_set_id']]

    query = (auth.vidjil_accessible_query('access', db.sequence_file))

    orderby = [~db.sequence_file.id]
    columns = [
        db.sequence_file.id,
        db.sequence_file.filename,
        db.sequence_file.info,
    ]

    grid = Grid(path,
                query,
                left = [
                ],
                columns=columns,
                search_queries=search_queries,
                orderby=orderby,
                show_id=True,
                T=T,
                **grid_param)


    return dict(grid=grid,
                title="Patient (" + str(id)+")")
