# -*- coding: utf-8 -*-
#from apps.vidjil.modules import jstree
import json
import os
from .. import defs
from ..modules import vidjil_utils
from ..modules.stats_decorator import *
from ..modules.sampleSet import get_sample_set_id_from_results_file
from ..modules.controller_utils import error_message
from ..tasks import schedule_run, schedule_fuse
from py4web import action, request, abort, redirect, URL, Field, HTTP, response
from ..common import db, session, T, flash, cache, authenticated, unauthenticated, auth, log, scheduler


## return admin_panel
@action("/vidjil/results_file/index", method=["POST", "GET"])
@action.uses("results_file/index.html", db, auth.user)
def index():
    if auth.is_admin():

        query = db(
            (db.results_file.sequence_file_id==db.sequence_file.id)
            & (db.sequence_file.id==db.sample_set_membership.sequence_file_id)
            & (db.sample_set_membership.sample_set_id==db.patient.sample_set_id)
            & (db.results_file.config_id==db.config.id)
            & (db.results_file.hidden == False)
        ).select(
            orderby = ~db.results_file.run_date
        )
        
        for row in query :
            if row.results_file.scheduler_task_id is None :
                row.status = '' 
            else:
                row.status = db.scheduler_task[row.results_file.scheduler_task_id ].status 
            pass
        
        ##sort result
        reverse = False
        if request.query["reverse"] == "true" :
            reverse = True
        if request.query["sort"] == "name" :
            query = query.sort(lambda row : row.patient.last_name, reverse=reverse)
        elif request.query["sort"] == "run_date" :
            query = query.sort(lambda row : row.results_file.run_date, reverse=reverse)
        elif request.query["sort"] == "config" :
            query = query.sort(lambda row : row.config.name, reverse=reverse)
        elif request.query["sort"] == "patient" :
            query = query.sort(lambda row : row.patient.last_name, reverse=reverse)
        elif request.query["sort"] == "status" :
            query = query.sort(lambda row : row.status, reverse=reverse)
        elif "sort" in request.query and request.query["sort"] != "":
            query = query.sort(lambda row : row.sequence_file[request.query["sort"]], reverse=reverse)

        ##filter
        ##filter
        if "filter" not in request.query :
            request.query["filter"] = ""

        for row in query :
            row.string = [row.sequence_file.filename, row.config.name, row.patient.last_name, row.patient.first_name, row.sequence_file.producer, str(row.results_file.run_date), row.status]
        query = query.find(lambda row : vidjil_utils.advanced_filter(row.string,request.query["filter"]) )
        
        log.info("access results file admin panel", extra={'user_id': auth.user_id,
                'record_id': None,
                'table_name': "results_file"})
        return dict(query = query,
                    reverse=reverse,
                    auth=auth, db=db)

@action("/vidjil/results_file/run_all_patients", method=["POST", "GET"])
@action.uses(db, auth.user)
def run_all_patients():
    if auth.is_admin():
        query = db(
                (db.sample_set.sample_type == defs.SET_TYPE_PATIENT)
                & (db.sample_set_membership.sample_set_id == db.sample_set.id)
                & (db.sample_set_membership.sequence_file_id == db.results_file.sequence_file_id)
                ).select(db.sample_set.id, db.results_file.sequence_file_id, db.results_file.id)

        for row in query:
            schedule_run(row.results_file.sequence_file_id, row.results_file.config_id)

        res = {"success" : "true",
               "message" : "rerun all"}
        log.warning(res)
        return json.dumps(res, separators=(',',':'))

## display run page result 
## need ["results_file_id"]
@action("/vidjil/results_file/info", method=["POST", "GET"])
@action.uses("results_file/info.html", db, auth.user)
def info():
    sample_set_id = get_sample_set_id_from_results_file(request.query["results_file_id"])
    if (auth.can_modify_sample_set(int(sample_set_id))):
        out_folder = defs.DIR_OUT_VIDJIL_ID % int(request.query["results_file_id"])
        output_filename = defs.BASENAME_OUT_VIDJIL_ID % int(request.query["results_file_id"])

        if os.path.exists(f"{out_folder}/{output_filename}.vidjil.log"):
            with open(f"{out_folder}/{output_filename}.vidjil.log", 'r', encoding='utf-8') as f: 
                content = f.read()
        else:
            content = None
            
        log.info("access results file info", extra={'user_id': auth.user_id,
                'record_id': request.query["results_file_id"],
                'table_name': "results_file"})
        return dict(message=T('result info'), content_log=content, auth=auth, db=db)
    else :
        res = {"message": "acces denied"}
        return json.dumps(res, separators=(',',':'))

@action("/vidjil/results_file/output", method=["POST", "GET"])
@action.uses("results_file/output.html", db, auth.user)
def output():
    sample_set_id = get_sample_set_id_from_results_file(request.query["results_file_id"])
    if (auth.can_view_sample_set(int(sample_set_id))):
        results_id = int(request.query["results_file_id"])
        output_directory = defs.DIR_OUT_VIDJIL_ID % results_id
        files = os.listdir(output_directory)

        file_dicts = []

        for f in files:
            file_size = vidjil_utils.format_size(os.stat(output_directory + f).st_size)
            file_dicts.append({'filename': f, 'size': file_size})

        log.info("view output files", extra={'user_id': auth.user_id,
                'record_id': request.query["results_file_id"],
                'table_name': "results_file"})
        return dict(message="output files",
                    results_file_id = results_id,
                    files=file_dicts,
                    auth=auth, db=db)
    return error_message("access denied")

def download():
    sample_set_id = get_sample_set_id_from_results_file(request.query["results_file_id"])
    if auth.can_view_sample_set(int(sample_set_id)) and not '..' in request.query['filename']:
        results_id = int(request.query["results_file_id"])
        directory = defs.DIR_OUT_VIDJIL_ID % results_id
        filepath = directory + request.query['filename']
        try:
            log.info("Downloaded results file", extra={'user_id': auth.user_id,
                'record_id': request.query["results_file_id"],
                'table_name': "results_file"})
            return response.stream(open(filepath), attachment = True, filename = request.query['filename'], chunk_size=10**6)
        except IOError:
            return error_message("File could not be read")
    return error_message("access denied")
    

@action("/vidjil/results_file/confirm", method=["POST", "GET"])
@action.uses("results_file/confirm.html", db, auth.user)
def confirm():
    sample_set_id = request.query['sample_set_id']

    if (auth.can_modify_sample_set(int(sample_set_id))
        & auth.can_process_sample_set(int(sample_set_id))):
        return dict(message=T('result confirm'), auth=auth, db=db)
    else :
        res = {"message": "acces denied"}
        return json.dumps(res, separators=(',',':'))
    
@action("/vidjil/results_file/delete", method=["POST", "GET"])
@action.uses(db, auth.user)
def delete():
    sample_set_id = request.query['sample_set_id']

    if (auth.can_modify_sample_set(int(sample_set_id))
        & auth.can_process_sample_set(int(sample_set_id))):
        
        config_id = db.results_file[request.query["results_file_id"]].config_id
        
        #delete results_file
        db(db.results_file.id == request.query["results_file_id"]).delete()
        
        #delete fused_file 
        count = db((sample_set_id == db.sample_set_membership.sample_set_id) &
                   (db.sequence_file.id == db.sample_set_membership.sequence_file_id) &
                   (db.sequence_file.id == db.results_file.sequence_file_id) &
                   (db.results_file.config_id == config_id)
                   ).count()
        
        if count == 0 :
            db((db.fused_file.sample_set_id == sample_set_id) &
               (db.fused_file.config_id == config_id)
               ).delete()
        else:
            schedule_fuse([sample_set_id], [config_id])
        
        res = {"redirect": "sample_set/index",
               "args" : { "id" : sample_set_id,
                          "config_id" : config_id},
               "success": "true",
               "message": "[%s] (%s) c%s: process deleted " % (request.query["results_file_id"], sample_set_id, config_id)}
        log.info(res, extra={'user_id': auth.user_id,
                'record_id': request.query["results_file_id"],
                'table_name': "results_file"})
        return json.dumps(res, separators=(',',':'))
    else :
        res = {"message": "acces denied"}
        return json.dumps(res, separators=(',',':'))
