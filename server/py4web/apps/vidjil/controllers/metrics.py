

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


def getMetricByName(metric_name):
    if "metrics" in auth.groups or auth.is_admin(): # WARNING !!! Iconsistency, switch between mutiple call to admin/not admin. (tested with API)
 
        if metric_name == "users_count":
            return len(db().select(db.auth_user.id.count(),  groupby=db.auth_user.id ))
        
        elif metric_name == "group_count":
            return len(db().select(db.auth_group.id.count(), groupby=db.auth_group.id ))
        
        elif metric_name == "group_count_only_test":
            return len(db(db.auth_group.role.like('test%')).select(db.auth_group.ALL, db.auth_group.id.count(), groupby=db.auth_group.id)) #pas fini
 
        elif metric_name == "login_count":
            return db(db.auth_event.user_id==db.auth_user.id).select(db.auth_event.user_id, db.auth_event.description, db.auth_event.id.count(), db.auth_user.email, groupby=db.auth_event.user_id|db.auth_event.description ) # not fill for the moment
 
        # # Patients; runs; sets
        elif metric_name == "set_patients_count":
            return db(db.patient).count()
        
        elif metric_name == "set_runs_count":
            return db(db.run).count()
        
        elif metric_name == "set_generic_count":
            return db(db.generic).count()
                
        # Patients; runs; sets By USER
        elif metric_name == "set_patients_by_user":
            return db((db.patient.sample_set_id==db.sample_set.id) & (db.sample_set.sample_type=="patient")
                        ).select(db.patient.creator.with_alias("user_id"), db.patient.id.count().with_alias("count"), groupby=db.patient.creator )
        
        elif metric_name == "set_runs_by_user":
            return db((db.run.sample_set_id==db.sample_set.id) & (db.sample_set.sample_type=="run")
                        ).select(db.run.creator.with_alias("user_id"), db.run.id.count().with_alias("count"), groupby=db.run.creator )
        
        elif metric_name == "set_generic_by_user":
            return db((db.generic.sample_set_id==db.sample_set.id) & (db.sample_set.sample_type=="generic")
                        ).select(db.generic.creator.with_alias("user_id"), db.generic.id.count().with_alias("count"), groupby=db.generic.creator )
 
        # Samples, analysis Globally
        elif metric_name == "sequence_count":
            return db(db.sequence_file).count()
        elif metric_name == "results_count":
            return db(db.results_file).count()
        elif metric_name == "status_analysis":
            return db(db.scheduler_task.status != "COMPLETED").select(db.scheduler_task.status, db.scheduler_task.id.count(), db.scheduler_task.task_name, groupby=db.scheduler_task.task_name|db.scheduler_task.status )
 
        # Samples, analysis
        elif metric_name == "sequence_by_user":
            return db().select(db.sequence_file.provider.with_alias("user_id"), 
                        db.sequence_file.id.count().with_alias("count_sequence"), 
                        groupby=db.sequence_file.provider)
        elif metric_name == "sequence_size_by_user":
            return db().select(db.sequence_file.provider.with_alias("user_id"), 
                        (db.sequence_file.size_file.sum()+db.sequence_file.size_file2.sum()).with_alias("size_file_sum"), 
                        groupby=db.sequence_file.provider)
 
        elif metric_name == "config_analysis":
            return db(db.results_file.config_id==db.config.id).select(db.results_file.config_id, db.config.name, db.config.program, db.results_file.id.count(),  groupby=db.results_file.config_id )
 

         # Patients; runs; sets By GROUP
        elif metric_name == "set_patients_by_group":
            return db((db.sample_set.sample_type=="patient") & 
                      (db.sample_set.creator==db.auth_membership.user_id)  & 
                      (db.auth_membership.group_id==db.auth_group.id)
                    ).select(db.auth_group.id.with_alias("group_id"), 
                             db.auth_group.role.with_alias("group_name"), 
                             db.sample_set.id.count().with_alias("count"), 
                             groupby=db.auth_group.id 
                            )
        
        elif metric_name == "set_runs_by_group":
            return db((db.sample_set.sample_type=="run") & 
                      (db.sample_set.creator==db.auth_membership.user_id)  & 
                      (db.auth_membership.group_id==db.auth_group.id)
                    ).select(db.auth_group.id.with_alias("group_id"), 
                             db.auth_group.role.with_alias("group_name"), 
                             db.sample_set.id.count().with_alias("count"), 
                             groupby=db.auth_group.id 
                            )

        elif metric_name == "set_generic_by_group":
            return db((db.sample_set.sample_type=="generc") & 
                      (db.sample_set.creator==db.auth_membership.user_id)  & 
                      (db.auth_membership.group_id==db.auth_group.id)
                    ).select(db.auth_group.id.with_alias("group_id"), 
                             db.auth_group.role.with_alias("group_name"), 
                             db.sample_set.id.count().with_alias("count"), 
                             groupby=db.auth_group.id 
                            )



        # Very very long on app database. Don't use for the moment
        elif metric_name == "config_analysis_by_groups":
            return db((db.results_file.sequence_file_id==db.sample_set_membership.sequence_file_id) & 
                        (db.sample_set_membership.sample_set_id==db.sample_set.id) &
                        (db.sample_set.creator==db.auth_membership.user_id)  & 
                        (db.auth_membership.group_id==db.auth_group.id) &
                        (db.config.id==db.results_file.config_id)
                        ).select(db.config.name, 
                                    db.config.program, 
                                    db.results_file.config_id, 
                                    db.results_file.id.count(), 
                                    db.auth_group.role, 
                                    db.sample_set.sample_type, 
                                    groupby=(db.results_file.config_id|db.auth_group.id| db.sample_set.sample_type))
 

        elif metric_name == "config_analysis_by_users_patients":
            return db((db.config.id==db.results_file.config_id) & 
                        (db.results_file.sequence_file_id==db.sample_set_membership.sequence_file_id) & 
                        (db.sample_set_membership.sample_set_id==db.patient.sample_set_id)
                        ).select(db.config.name, db.config.program, db.results_file.config_id, db.results_file.id.count(), groupby=(db.results_file.config_id))

        elif metric_name == "config_analysis_by_users_runs":
            return db((db.config.id==db.results_file.config_id) & 
                        (db.results_file.sequence_file_id==db.sample_set_membership.sequence_file_id) & 
                        (db.sample_set_membership.sample_set_id==db.run.sample_set_id)
                        ).select(db.config.name, db.config.program, db.results_file.config_id, db.results_file.id.count(), groupby=(db.results_file.config_id))

        elif metric_name == "config_analysis_by_users_generic":
            return db((db.config.id==db.results_file.config_id) & 
                        (db.results_file.sequence_file_id==db.sample_set_membership.sequence_file_id) & 
                        (db.sample_set_membership.sample_set_id==db.generic.sample_set_id)
                        ).select(db.config.name, db.config.program, db.results_file.config_id, db.results_file.id.count(), groupby=(db.results_file.config_id))

        else:
            raise Exception("Metric name asked don't exist: {metric_name}")
    return None




def getMetricsList(metrics_list, auth):
    if "metrics" in auth.groups or auth.is_admin(): # WARNING !!! Iconsistency, switch between mutiple call to admin/not admin. (tested with API)
        message = 'status METRICS'
        start_time = time.time()
        delta_time = time.time()
        data = {"request_times": {}}                 
        data["message"] = message

        for metric in metrics_list:
            data[metric] = getMetricByName(metric)
            data["request_times"][metric] = time.time() - delta_time
            delta_time = time.time();

        data["request_times"]["total"] = time.time() - start_time
        log.debug("METRICS loaded (%.3fs)" % (time.time() - start_time))    
    else:
        data = {"message": 'status NOT in metrics group'}
    return data


#########################################################################
ALL_METRICS = {
	"group_count":                       {"fast": True,  "long": False},
	"group_count_only_test":             {"fast": True,  "long": False},
	"login_count":                       {"fast": True,  "long": False},
	"set_patients_count":                {"fast": True,  "long": False},
	"set_runs_count":                    {"fast": True,  "long": False},
	"set_generic_count":                 {"fast": True,  "long": False},
	"set_patients_by_user":              {"fast": True,  "long": False},
	"set_runs_by_user":                  {"fast": True,  "long": False},
	"set_generic_by_user":               {"fast": True,  "long": False},
	"sequence_count":                    {"fast": True,  "long": False},
	"results_count":                     {"fast": True,  "long": False},
	"status_analysis":                   {"fast": True,  "long": False},
	"sequence_by_user":                  {"fast": True,  "long": False},
	"sequence_size_by_user":             {"fast": True,  "long": False},
	"config_analysis":                   {"fast": True,  "long": False},
	"config_analysis_by_users_patients": {"fast": True,  "long": False},
	"config_analysis_by_users_runs":     {"fast": True,  "long": False},
	"config_analysis_by_users_generic":  {"fast": True,  "long": False},
	"set_patients_by_group":             {"fast": False, "long": True},
	"set_runs_by_group":                 {"fast": False, "long": True},
	"set_generic_by_group":              {"fast": False, "long": True},
	"config_analysis_by_groups":         {"fast": False, "long": True},
}
#########################################################################
@action("/vidjil/metrics_fast", method=["POST", "GET"])
@action.uses(auth, db)
def metricsFast():
    fast_metrics = [key for key in ALL_METRICS.keys() if ALL_METRICS[key]["fast"] ]
    return getMetricsList(fast_metrics, auth)


@action("/vidjil/metrics_long", method=["POST", "GET"])
@action.uses(auth, db)
def metricsLong():
    long_metrics = [key for key in ALL_METRICS.keys() if ALL_METRICS[key]["long"] ]
    return getMetricsList(long_metrics, auth)

@action("/vidjil/metrics_all", method=["POST", "GET"])
@action.uses(auth, db)
def metricsAll():
    all_metrics = [key for key in ALL_METRICS.keys()]
    return getMetricsList(all_metrics, auth)

@action("/vidjil/metrics_by_name", method=["POST", "GET"])
@action.uses(auth, db)
def metricsByName():
    """ Allow to get metrics asked by a given list in url (',' jointure') """
    metrics =  request.params['metric'].split(",")
    print( f"Ask metrics list: {metrics}")
    return getMetricsList(metrics, auth)

#########################################################################



@action("/vidjil/set_creator_samples_set", method=["POST", "GET"])
@action.uses(auth, db)
def set_creator_samples_set():
    """
    Function to launch to fill creator field of sample_set table from content of field creator of each set type
    Fill only empty value. 
    To be lauch once at release 2024.10
    After that, this field will be filled automatically at each set creation
    """

    # Get data for each sample_set
    for set_type in ["patient", "run", "generic"]:
        subquery_patient = db((db.sample_set.sample_type == set_type) & 
              (db.sample_set.creator == None) & 
              (db.sample_set.id == db[set_type].sample_set_id) &
              (db[set_type].creator == db.auth_user.id)
            ).select(db.sample_set.id, db.sample_set.creator, db[set_type].id, db[set_type].creator, db.auth_user.id)

        # Update sample_set creator
        for elt in subquery_patient:
            db.sample_set[elt.sample_set.id].update_record(creator=elt.auth_user.id )
            db.commit()
    return
