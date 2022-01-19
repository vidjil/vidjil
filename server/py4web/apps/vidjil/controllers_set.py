import os
from py4web import action, request, abort, redirect, URL, Field, HTTP
from yatl.helpers import A, I
from py4web.utils.form import Form, FormStyleDefault
from py4web.utils.factories import ActionFactory, Inject
from py4web.utils.grid import Grid, GridClassStyle, Column
from py4web.utils.param import Param
from py4web.utils.publisher import Publisher, ALLOW_ALL_POLICY
from pydal.validators import IS_NOT_EMPTY, IS_INT_IN_RANGE, IS_IN_SET, IS_IN_DB
from yatl.helpers import INPUT, H1, HTML, BODY, A, DIV
from py4web.utils.param import Param
from .settings import SESSION_SECRET_KEY
from .modules.permission_enum import PermissionEnum

from .common import db, session, T, flash, cache, authenticated, unauthenticated, auth

# import websocket examples
from .ws import *
from .socketio import *

# exposes services necessary to access the db.thing via ajax
publisher = Publisher(db, policy=ALLOW_ALL_POLICY)


@action("patient/list")
@action.uses("index.html")
def index():
    return {}


@action("patient/list2")
@action("patient/list2/<path:path>", method=["POST", "GET"])
@action.uses(session, db, auth, T, "html_grid.html")
def patient_grid(path=None):
    #  controllers and used for all grids in the app
    grid_param = dict(
        rows_per_page=20,
        include_action_button_text=True,
        search_button_text="Filter",
        formstyle=FormStyleDefault,
        grid_class_style=GridClassStyle)
                               
    search_queries = [
        ['By Name', lambda value: db.patient.fist_name.contains(value)],
        ['By Creator', lambda value: db.auth_user.fist_name.contains(value)],
        ##['By Color', lambda value: db.thing.color == value],
        ##['By Name or Color', lambda value: db.thing.name.contains(value)|(db.thing.color == value)],
    ]

    query = db.patient.id > 0
    orderby = [~db.patient.id]
    columns = [field for field in db.patient if field.readable]
    columns = [
        Column("Id", lambda row: f"{row.id}"),
        #Column("Patient", lambda row: f"{row.first_name} {row.last_name}"),
        db.patient.first_name,
        db.patient.last_name,
        db.patient.birth,
        db.patient.creator,
        #Column("Creator", lambda row: f"{row.creator.first_name} {row.creator.last_name}"),
    ]

    s_table = db.patient

    grid = Grid(path,
                query,
                left = [db.sample_set_membership.on(s_table.sample_set_id == db.sample_set_membership.sample_set_id),
                        db.sequence_file.on(db.sample_set_membership.sequence_file_id == db.sequence_file.id),
                        db.fused_file.on(s_table.sample_set_id == db.fused_file.sample_set_id),
                        db.config.on(db.fused_file.config_id == db.config.id),
                        db.auth_permission.with_alias('generic_perm').on(
                            (db.generic_perm.table_name == 'sample_set') &
                            (db.generic_perm.record_id == s_table.sample_set_id) &
                            (db.generic_perm.name == PermissionEnum.access.value)),
                        db.auth_group.on(db.generic_perm.group_id == db.auth_group.id),
                        db.auth_membership.on(db.auth_group.id == db.auth_membership.group_id),
                        #db.auth_user.on(db.auth_user.id == s_table.creator)
                ],
                columns=columns,
                search_queries=search_queries,
                orderby=orderby,
                show_id=False,
                T=T,
                **grid_param)

    #grid.formatters['thing.color'] = lambda color: I(_class="fa fa-circle", _style="color:"+color)

    return dict(grid=grid)