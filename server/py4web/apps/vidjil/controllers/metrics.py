

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
from collections import OrderedDict
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
@action.uses(auth, db)
def metrics():
    if "metrics" in auth.groups or auth.is_admin(): # WARNING !!! Iconsistency, switch between mutiple call to admin/not admin. (tested with API)
        message = 'status METRICS'
        start_time = time.time()
        delta_time = time.time()
        data = {}
                     
        data["message"] = message
        request_times = []
        timer_count = 1
        data["users_count"] = len(db().select(db.auth_user.id.count(),  groupby=db.auth_user.id ))
        request_times.append([f"{timer_count}_users_count", time.time()  - delta_time]); delta_time = time.time(); timer_count+=1
        data["group_count"] = len(db().select(db.auth_group.id.count(), groupby=db.auth_group.id ))
        request_times.append([f"{timer_count}_group_count", time.time()  - delta_time]); delta_time = time.time(); timer_count+=1
        data["group_count_only_test"] = len(db(db.auth_group.role.like('test%')).select(db.auth_group.ALL, db.auth_group.id.count(), groupby=db.auth_group.id)) #pas fini
        request_times.append([f"{timer_count}_group_count_only_test", time.time()  - delta_time]); delta_time = time.time(); timer_count+=1

        data["login_count"] = db(db.auth_event.user_id==db.auth_user.id).select(db.auth_event.user_id, db.auth_event.description, db.auth_event.id.count(), db.auth_user.email, groupby=db.auth_event.user_id|db.auth_event.description ) # not fill for the moment
        request_times.append([f"{timer_count}_login_count", time.time()  - delta_time]); delta_time = time.time(); timer_count+=1

        # # # Patients; runs; sets
        data["set_patients_count"] = db(db.patient).count()
        request_times.append([f"{timer_count}_set_patients_count", time.time()  - delta_time]); delta_time = time.time(); timer_count+=1
        data["set_runs_count"] = db(db.run).count()
        request_times.append([f"{timer_count}_set_runs_count", time.time()  - delta_time]); delta_time = time.time(); timer_count+=1
        data["set_generic_count"] = db(db.generic).count()
        request_times.append([f"{timer_count}_set_generic_count", time.time()  - delta_time]); delta_time = time.time(); timer_count+=1
        
        # # Patients; runs; sets By USER
        data["set_patients_by_user"] = db((db.patient.sample_set_id==db.sample_set.id) & (db.sample_set.sample_type=="patient")
                ).select(db.patient.creator.with_alias("user_id"), db.patient.id.count().with_alias("count"), groupby=db.patient.creator )
        request_times.append([f"{timer_count}_set_patients_by_user", time.time()  - delta_time]); delta_time = time.time(); timer_count+=1
        data["set_runs_by_user"] = db((db.run.sample_set_id==db.sample_set.id) & (db.sample_set.sample_type=="run")
                ).select(db.run.creator.with_alias("user_id"), db.run.id.count().with_alias("count"), groupby=db.run.creator )
        request_times.append([f"{timer_count}_set_runs_by_user", time.time()  - delta_time]); delta_time = time.time(); timer_count+=1
        data["set_generic_by_user"] = db((db.generic.sample_set_id==db.sample_set.id) & (db.sample_set.sample_type=="generic")
                ).select(db.generic.creator.with_alias("user_id"), db.generic.id.count().with_alias("count"), groupby=db.generic.creator )
        request_times.append([f"{timer_count}_set_generic_by_user", time.time()  - delta_time]); delta_time = time.time(); timer_count+=1

        # # Samples, analysis Globally
        data["sequence_count"] = db(db.sequence_file).count()
        request_times.append([f"{timer_count}_sequence_count", time.time()  - delta_time]); delta_time = time.time(); timer_count+=1
        data["results_count"] = db(db.results_file).count()
        request_times.append([f"{timer_count}_results_count", time.time()  - delta_time]); delta_time = time.time(); timer_count+=1
        data["status_analysis"] = db().select(db.scheduler_task.status, db.scheduler_task.id.count(), db.scheduler_task.task_name, groupby=db.scheduler_task.task_name|db.scheduler_task.status )
        request_times.append([f"{timer_count}_status_analysis", time.time()  - delta_time]); delta_time = time.time(); timer_count+=1

        # # Samples, analysis
        data["sequence_by_user"] = db().select(db.sequence_file.provider.with_alias("user_id"), 
                db.sequence_file.id.count().with_alias("count_sequence"), 
                groupby=db.sequence_file.provider)
        request_times.append([f"{timer_count}_sequence_by_user", time.time()  - delta_time]); delta_time = time.time(); timer_count+=1
        data["sequence_size_by_user"] = db().select(db.sequence_file.provider.with_alias("user_id"), 
                (db.sequence_file.size_file.sum()+db.sequence_file.size_file2.sum()).with_alias("size_file_sum"), 
                groupby=db.sequence_file.provider)
        request_times.append([f"{timer_count}_sequence_size_by_user", time.time()  - delta_time]); delta_time = time.time(); timer_count+=1

        data["config_analysis"] = db(db.results_file.config_id==db.config.id).select(db.results_file.config_id, db.config.name, db.config.program, db.results_file.id.count(),  groupby=db.results_file.config_id )
        request_times.append([f"{timer_count}_config_analysis", time.time()  - delta_time]); delta_time = time.time(); timer_count+=1
        data["config_analysis_by_groups"] = db((db.config.id==db.results_file.config_id) & 
                (db.results_file.sequence_file_id==db.sample_set_membership.sequence_file_id) & 
                (   ((db.sample_set_membership.sample_set_id==db.patient.sample_set_id) & (db.patient.creator==db.auth_membership.user_id)) |
                    ((db.sample_set_membership.sample_set_id==db.run.sample_set_id) & (db.run.creator==db.auth_membership.user_id)) |
                    ((db.sample_set_membership.sample_set_id==db.generic.sample_set_id) & (db.generic.creator==db.auth_membership.user_id))
                )  & 
                (db.auth_membership.group_id==db.auth_group.id)).select(db.config.name, db.config.program, db.results_file.config_id, db.results_file.id.count(), db.auth_group.role, groupby=(db.results_file.config_id|db.auth_group.id))
        request_times.append([f"{timer_count}_config_analysis_by_groups", time.time()  - delta_time]); delta_time = time.time(); timer_count+=1


        request_times.append(["total", time.time() - start_time])
        data["request_times"] = OrderedDict([request for request in request_times])
        log.debug("METRICS loaded (%.3fs)" % (time.time() - start_time))
    
    else:
        data = {"message": 'status NOT in metrics group'}
    return data

#########################################################################

