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
from ..modules.zmodel_factory import ModelFactory
from ..user_groups import get_default_creation_group
from ..VidjilAuth import VidjilAuth
import types
from ..common import db, session, T, flash, cache, authenticated, unauthenticated, auth

# exposes services necessary to access the db.thing via ajax
publisher = Publisher(db, policy=ALLOW_ALL_POLICY)



@action("/vidjil/patient/<id:int>", method=["POST", "GET"])
@action.uses("html_grid.html",session, db, auth, T)
@action.uses(auth.user)
def patient(id=None):

    ### check sample_set_id
    patient = db.patient[id]
    sample_set = db.sample_set[patient['sample_set_id']]
    sample_set_id = sample_set.id
    factory = ModelFactory()
    helper = factory.get_instance(type=sample_set.sample_type, db=db, auth=auth)
    data = helper.get_data(sample_set_id)
    info_file = helper.get_info_dict(data)

    if not auth.can_view_sample_set(sample_set_id):
        return "you don't have access to this sample_set"

    ### check config_id 
    if "config_id" in request.query and request.query["config_id"] != "-1" and request.query["config_id"] != "None":
        config_id = request.query["config_id"]
        config = True
    else :
        most_used_query = db(
                (db.fused_file.sample_set_id == sample_set.id)
            ).select(
                db.fused_file.config_id.with_alias('id'),
                db.fused_file.id.count().with_alias('use_count'),
                groupby=db.fused_file.config_id,
                orderby=db.fused_file.id.count(),
                limitby=(0,1)
            )
        if len(most_used_query) > 0:
            config_id = most_used_query[0].id
            config = True
        else:
            config_id = -1
            config = False


    fused_count = 0
    fused_file = ""
    fused_filename = ""
    analysis_count = 0
    analysis_file = ""
    analysis_filename = ""

    if config :
        config_name = db.config[config_id].name

        fused = db(
            (db.fused_file.sample_set_id == sample_set_id)
            & (db.fused_file.config_id == config_id)
        )

        analysis = db(
            db.analysis_file.sample_set_id == sample_set_id
        ).select(orderby=~db.analysis_file.analyze_date)
        
        fused_count = fused.count()
        fused_file = fused.select()
        fused_filename = info_file["filename"] +"_"+ config_name + ".vidjil"
        analysis_count = len(analysis)
        analysis_file = analysis
        analysis_filename = info_file["filename"]+"_"+ config_name + ".analysis"
        

    path=None
    grid_param = dict(
        rows_per_page=100,
        include_action_button_text=True,
        search_button_text="Filter",
        formstyle=FormStyleDefault,
        grid_class_style=GridClassStyle)
                               

    query = (   (db.sequence_file.id == db.sample_set_membership.sequence_file_id)
              & (db.sample_set_membership.sample_set_id == sample_set_id))

    orderby = [db.sequence_file.id]
    columns = [
        db.sequence_file.id,
        db.sequence_file.filename,
        db.sequence_file.info
    ]

    grid = Grid(path,
                query,
                left = [],
                columns=columns,
                orderby=orderby,
                show_id=True,
                create='/vidjil/patient/'+str(id)+'/add_file',
                editable=False, #'/vidjil/sequence_file/update',
                deletable='/vidjil/patient/'+str(id)+'/remove_file',
                T=T,
                **grid_param)


    return dict(grid=grid,
                title="Patient (" + str(id)+") -- config (" + str(config_id)+")")




@action("/vidjil/patient/<patient_id:int>/add_file", method=["POST", "GET"])
@action.uses(db, "forms.html")
@action.uses(auth.user)
def patient_add_file(patient_id=None):

    patient = db.patient[patient_id]
    sample_set = db.sample_set[patient['sample_set_id']]
    sample_set_id = sample_set.id

    form = Form([
        Field('data_file', 'upload', requires=IS_NOT_EMPTY()),
        Field('sampling_date','date', requires=IS_NOT_EMPTY()),
        Field('info','text'),
        ])

    if form.accepted:
        # insert new pat in db
        sequence_file_id = db.sequence_file.insert(data_file = form.vars['data_file'],
                                        sampling_date = form.vars['sampling_date'],
                                        info = form.vars['info'],
                                        provider = auth.user_id )

        # register sequence_file to sample_set
        db.sample_set_membership.insert(sample_set_id = sample_set_id,
                                        sequence_file_id = sequence_file_id)

        redirect(URL('/vidjil/patient/'+str(patient_id)))

    return dict(title="add sequence file",
                forms=[form])


# remove sequence_file from the patient sample_set
@action("/vidjil/patient/<patient_id:int>/remove_file/<id:int>", method=["POST", "GET"])
@action.uses(db, "forms.html")
@action.uses(auth.user)
def patient_remove_file(patient_id=None, id=None):

    patient = db.patient[patient_id]
    sample_set = db.sample_set[patient['sample_set_id']]
    sample_set_id = sample_set.id

    # unregister sequence_file from patient sample_set
    db( (db.sample_set_membership.sequence_file_id == id) &
        (db.sample_set_membership.sample_set_id == sample_set_id)).delete()


    redirect(URL('/vidjil/patient/'+str(patient_id)))

