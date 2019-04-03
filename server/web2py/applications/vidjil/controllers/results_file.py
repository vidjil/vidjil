# coding: utf8
import gluon.contrib.simplejson
import vidjil_utils
from controller_utils import error_message
import os
import StringIO
import math

if request.env.http_origin:
    response.headers['Access-Control-Allow-Origin'] = request.env.http_origin  
    response.headers['Access-Control-Allow-Credentials'] = 'true'
    response.headers['Access-Control-Max-Age'] = 86400

## return admin_panel
def index():
    if auth.is_admin():

        query = db(
            (db.results_file.sequence_file_id==db.sequence_file.id)
            & (db.sequence_file.id==db.sample_set_membership.sequence_file_id)
            & (db.sample_set_membership.sample_set_id==db.patient.sample_set_id)
            & (db.results_file.config_id==db.config.id)
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
        if request.vars["reverse"] == "true" :
            reverse = True
        if request.vars["sort"] == "name" :
            query = query.sort(lambda row : row.patient.last_name, reverse=reverse)
        elif request.vars["sort"] == "run_date" :
            query = query.sort(lambda row : row.results_file.run_date, reverse=reverse)
        elif request.vars["sort"] == "config" :
            query = query.sort(lambda row : row.config.name, reverse=reverse)
        elif request.vars["sort"] == "patient" :
            query = query.sort(lambda row : row.patient.last_name, reverse=reverse)
        elif request.vars["sort"] == "status" :
            query = query.sort(lambda row : row.status, reverse=reverse)
        elif "sort" in request.vars and request.vars["sort"] != "":
            query = query.sort(lambda row : row.sequence_file[request.vars["sort"]], reverse=reverse)

        ##filter
        ##filter
        if "filter" not in request.vars :
            request.vars["filter"] = ""

        for row in query :
            row.string = [row.sequence_file.filename, row.config.name, row.patient.last_name, row.patient.first_name, row.sequence_file.producer, str(row.results_file.run_date), row.status]
        query = query.find(lambda row : vidjil_utils.advanced_filter(row.string,request.vars["filter"]) )
        
        log.info("access results file admin panel", extra={'user_id': auth.user.id,
                'record_id': None,
                'table_name': "results_file"})
        return dict(query = query,
                    reverse=reverse)

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
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))

## display run page result 
## need ["results_file_id"]
def info():
    sample_set_id = get_sample_set_id_from_results_file(request.vars["results_file_id"])
    if (auth.can_modify_sample_set(sample_set_id)):
        log.info("access results file info", extra={'user_id': auth.user.id,
                'record_id': request.vars["results_file_id"],
                'table_name': "results_file"})
        return dict(message=T('result info'))
    else :
        res = {"message": "acces denied"}
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))

def output():
    sample_set_id = get_sample_set_id_from_results_file(request.vars["results_file_id"])
    if (auth.can_view_sample_set(sample_set_id)):
        results_id = int(request.vars["results_file_id"])
        output_directory = defs.DIR_OUT_VIDJIL_ID % results_id
        files = os.listdir(output_directory)

        file_dicts = []

        for f in files:
            file_size = vidjil_utils.format_size(os.stat(output_directory + f).st_size)
            file_dicts.append({'filename': f, 'size': file_size})

        log.info("view output files", extra={'user_id': auth.user.id,
                'record_id': request.vars["results_file_id"],
                'table_name': "results_file"})
        return dict(message="output files",
                    results_file_id = results_id,
                    files=file_dicts)
    return error_message("access denied")

@cache.action()
def download():
    sample_set_id = get_sample_set_id_from_results_file(request.vars["results_file_id"])
    if auth.can_view_sample_set(sample_set_id) and not '..' in request.vars['filename']:
        results_id = int(request.vars["results_file_id"])
        directory = defs.DIR_OUT_VIDJIL_ID % results_id
        filepath = directory + request.vars['filename']
        try:
            log.info("Downloaded results file", extra={'user_id': auth.user.id,
                'record_id': request.vars["results_file_id"],
                'table_name': "results_file"})
            return response.stream(open(filepath), attachment = True, filename = request.vars['filename'], chunk_size=10**6)
        except IOError:
            return error_message("File could not be read")
    return error_message("access denied")
    
def confirm():
    sample_set_id = request.vars['sample_set_id']

    if (auth.can_modify_sample_set(sample_set_id)
        & auth.can_process_sample_set(sample_set_id)):
        return dict(message=T('result confirm'))
    else :
        res = {"message": "acces denied"}
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
    
#
def delete():
    sample_set_id = request.vars['sample_set_id']

    if (auth.can_modify_sample_set(sample_set_id)
        & auth.can_process_sample_set(sample_set_id)):
        
        config_id = db.results_file[request.vars["results_file_id"]].config_id
        
        #delete results_file
        db(db.results_file.id == request.vars["results_file_id"]).delete()
        
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
               "message": "[%s] (%s) c%s: process deleted " % (request.vars["results_file_id"], sample_set_id, config_id)}
        log.info(res, extra={'user_id': auth.user.id,
                'record_id': request.vars["results_file_id"],
                'table_name': "results_file"})
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
    else :
        res = {"message": "acces denied"}
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
