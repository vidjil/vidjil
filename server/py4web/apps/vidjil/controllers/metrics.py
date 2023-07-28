

# -*- coding: utf-8 -*-
# this file is released under public domain and you can use without limitations

#########################################################################
## This is a sample controller
## - index is the default action of any application
## - user is required for authentication and authorization
## - download is for downloading files uploaded in the db (does streaming)
## - call exposes all registered services (none by default)
#########################################################################

from sys import modules
from .. import defs
from ..modules import vidjil_utils
from ..modules.controller_utils import error_message
from ..modules.sampleSet import get_set_group
from ..modules.sequenceFile import *
from ..modules.sampleSet import get_sample_set_id_from_results_file
from ..modules.analysis_file import get_analysis_data
from ..controllers.group import add_default_group_permissions
from ..tasks import custom_fuse
from io import StringIO
import logging
import json
import os
import time
from py4web import action, request, abort, redirect, URL, Field, HTTP, response
from ..tasks import schedule_run
from yatl.helpers import INPUT, H1, HTML, BODY, A, DIV
from py4web.utils.param import Param
from ..settings import SESSION_SECRET_KEY
from ..modules.permission_enum import PermissionEnum
from ..modules.sequenceFile import check_space
from ..user_groups import get_default_creation_group
from ..VidjilAuth import VidjilAuth
from py4web.utils.auth import Auth, AuthAPI
import types

from ..common import db, session, cors, T, flash, cache, authenticated, unauthenticated, auth, log


#########################################################################
##return the default index page for vidjil (redirect to the browser)
@action("/vidjil/metrics", method=["POST", "GET"])
@action.uses(db)
def metrics():
    if auth.is_admin(): # WARNING !!! Iconsistency, switch between mutiple call to admin/not admin. (tested with API)
        message = 'status ADMIN'
        data = {
            "message"     : message,
            "users_count" : len(db().select(db.auth_user.ALL,   db.auth_user.id.count(),  groupby=db.auth_user.id )),
            "group_count" : len(db().select(db.auth_group.ALL,  db.auth_group.id.count(), groupby=db.auth_group.id )),
            "login_count" : len(db().select(db.auth_event.ALL,  db.auth_event.id.count(), groupby=db.auth_event.id )), # not fill for the moment

            # Patients; runs; sets
            "set_patients_count" : len(db().select(db.patient.ALL, db.patient.id.count(), groupby=db.patient.id )),
            "set_runs_count"     : len(db().select(db.run.ALL,     db.run.id.count(),     groupby=db.run.id )),
            "set_generic_count"  : len(db().select(db.generic.ALL, db.generic.id.count(), groupby=db.generic.id )),

            # Samples, analysis
            "sequence_count" : len(db().select(db.sequence_file.ALL, db.sequence_file.id.count(), groupby=db.sequence_file.id )),
            "results_count"  : len(db().select(db.results_file.ALL,  db.results_file.id.count(),  groupby=db.results_file.id )),
        }
    else:
        data = {"message": 'status NOT admin'}
    return data

#########################################################################
