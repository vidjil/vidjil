# -*- coding: utf-8 -*-
import subprocess
from .. import defs
from ..modules import vidjil_utils
import json
import os
import re
from py4web import action, request, URL
from .. import tasks
from ..common import db, auth, log, scheduler


##################################
# HELPERS
##################################

MAX_LOG_LINES = 500
ACCESS_DENIED = "access denied"

def _monitor():
    """
    >>> monitor().has_key('worker')
    True
    
    """
    
    # Get last results
    last_results = ''
    last_tasks = db(db.scheduler_task.id == db.results_file.scheduler_task_id).select(
        orderby=~db.results_file.id, limitby=(0,10))
    for res in last_tasks:
        last_results += res.scheduler_task.status[0]
        
    return dict (worker = len(db().select(db.scheduler_worker.ALL)),
                 queued = len(db(db.scheduler_task.status==tasks.STATUS_QUEUED).select()),
                 assigned = 0,
                 running = len(db(db.scheduler_task.status==tasks.STATUS_RUNNING).select()),
                 last_results = last_results)
    

##################################
# CONTROLLERS
##################################

## return admin_panel
@action("/vidjil/admin/index", method=["POST", "GET"])
@action.uses("admin/index.html", db, auth.user)
@vidjil_utils.jsontransformer
def index():
    if not auth.is_admin():
        res = {"success" : "false",
               "message" : ACCESS_DENIED,
               "redirect" : URL('sample_set', 'all', vars={'type': defs.SET_TYPE_PATIENT, 'page': 0}, scheme=True)}
        log.info(res)
        return json.dumps(res, separators=(',',':'))
    
    p = subprocess.Popen(["uptime"], stdout=subprocess.PIPE)
    uptime, err = p.communicate()
    
    p = subprocess.Popen(["df", "-h"], stdout=subprocess.PIPE)
    disk_use, err = p.communicate()
    revision = 'not versioned'
    try:
        p = subprocess.Popen(["git", "log", "-1", "--pretty=format:'%h (%cd)'", "--date=short", "--abbrev-commit"], stdout=subprocess.PIPE)
        revision,  err = p.communicate()
    except:
        pass
    
    d = _monitor()
    return dict(d,
                uptime=uptime,
                disk_use=disk_use,
                revision=revision,
                auth=auth,
                db=db)


@action("/vidjil/admin/showlog", method=["POST", "GET"])
@action.uses("admin/showlog.html", db, auth)
@vidjil_utils.jsontransformer
def showlog():
    if not auth.is_admin():
        res = {"success" : "false",
               "message" : ACCESS_DENIED,
               "redirect" : URL('sample_set', 'all', vars={'type': defs.SET_TYPE_PATIENT, 'page': 0}, scheme=True)}
        log.info(res)
        return json.dumps(res, separators=(',',':'))
         
    lines = []
    file = open(defs.DIR_LOG+request.query["file"])
    log_format = request.query['format'] if 'format' in request.query else ''

    if log_format == 'raw':
        return {'raw': ''.join(file.readlines()), 'format': log_format}

    if "filter" not in request.query :
        request.query["filter"] = ""
        
    for row in reversed(file.readlines()) :
        parsed = False

        if not vidjil_utils.advanced_filter([row], request.query["filter"]) :
            continue

        if log_format: # == 'vidjil'
            # Parses lines such as
            # [11889] 2015-02-01 12:01:28,367     INFO - default.py:312 1.23.45.67/user/Toto <Toto> xxxxx log message
            # [11889] 2015-02-01 12:01:28,367     INFO - default.py:312 1.23.45.67 log message
            # [11889] 2015-02-01 12:01:28,367     INFO - default.py:312 log message
            line = {}

            tmp = re.split('\t+| +', row) 

            if len(tmp) >= 7:
                parsed = True
                line["date"] = tmp[1]
                line["date2"] = tmp[2].split(',')[0]
                line["type"] = tmp[3]
                line["file"] = vidjil_utils.log_links(tmp[5])

                if tmp[6] != "Creating":
                    if len(tmp) < 9:
                        j = 0
                        parsed = False
                    elif '<' in tmp[8]:
                        line["user"] = tmp[8] + ' ' + tmp[7]
                        j = 9
                    else:
                        line["user"] = tmp[7]
                        j = 8
                    line["mes"] = " ".join(tmp[j:])
                else:
                    line["user"] = ""
                    line["mes"] = " ".join(tmp[6:])

                line["mes"] = line["mes"].replace(" at ", "\nat ")
                line["mes"] = vidjil_utils.log_links(line["mes"])

        if not parsed:
            line = { 'mes': row, 'date': '', 'date2': '', 'user': '', 'type':'', 'file':''}

        ### Stores log line
        lines.append(line)

        if len(lines) >= MAX_LOG_LINES :
            break
        
    return {'lines': lines, 'format': log_format, "auth": auth, "db":db}

## to use after change in the upload folder
def repair_missing_files():
    if auth.is_admin():
        
        flist = ""
        for row in db(db.sequence_file.id>0 and db.sequence_file.data_file != None).select() : 
            seq_file = defs.DIR_SEQUENCES+row.data_file
            
            if not os.path.exists(seq_file) :
                db.sequence_file[row.id] = dict(data_file = None)
                flist += " : " + str(row.filename)
            else :
                size = os.path.getsize(seq_file)
                db.sequence_file[row.id] = dict(size_file = size)
                
        res = {"success" : "true", "message" : "DB: references to missing files have been removed: "+flist}
        log.admin(res)
        return json.dumps(res, separators=(',',':'))

    
def _backup_database(stream):
    db.export_to_csv_file(stream)

def make_backup():
    if auth.is_admin():
        
        _backup_database(open(defs.DB_BACKUP_FILE, 'wb'))
                
        res = {"success" : "true", "message" : "DB backup -> %s" % defs.DB_BACKUP_FILE}
        log.admin(res)
        return json.dumps(res, separators=(',',':'))
    
    
def load_backup():
    if auth.is_admin():
        db.import_from_csv_file(open(defs.DB_BACKUP_FILE,'rb'))
    
def repair():
    if auth.is_admin():
        
        flist = "fix creator "
        for row in db(db.patient.creator == None).select() : 
            flist += " : " + str(row.id)
            db.patient[row.id] = dict(creator = auth.user_id)
            
        flist += "fix event "
        for row in db(db.auth_event.user_id == None).select() : 
            flist += " : " + str(row.id)
            db.auth_event[row.id] = dict(user_id = auth.user_id)
            
        flist += "fix permission "
        db(db.auth_permission.group_id == None).delete();
        
        flist += "fix sequence_file provider "
        for row in db(db.sequence_file.provider == None).select() :
            flist += " : " + str(row.id)
            db.sequence_file[row.id] = dict(provider = auth.user_id)
      
        flist += "fix sequence_file patient "
        db((db.sequence_file.id == db.sample_set_membership.sequence_file_id)
           & (db.sample_set_membership.sample_set_id == None)).delete();
        
        flist += "fix results_file "
        db(db.results_file.sequence_file_id == None).delete()
    
        flist += "fix fused file "
        for row in db(db.fused_file.fuse_date == None).select() :
            flist += " : " + str(row.id)
            db.fused_file[row.id] = dict(fuse_date = "1970-01-01 00:00:00")
        
        res = {"success" : "true", "message" : "DB repaired: " + flist}
        log.admin(res)
        return json.dumps(res, separators=(',',':'))

def reset_workers():
    if auth.is_admin():
        running_jobs = db(db.scheduler_task.status == tasks.STATUS_RUNNING).count()
        if running_jobs == 0:
            db(db.scheduler_worker.id > 0).delete()
            scheduler.die()
            db.commit()
            res = {"success" : "true", "message" : "Workers have been reset "}
        else:
            res = {"success" : "false", "message" : "Jobs are currently running or assigned. I don't want to restart workers"}
        log.admin(res)
        return json.dumps(res, separators=(',',':'))

@action("/vidjil/admin/clean_workers_status", method=["POST", "GET"])
@action.uses(db, auth.user)
@vidjil_utils.jsontransformer
def clean_workers_status():
    if not auth.is_admin():
        res = {"success" : "false",
               "message" : ACCESS_DENIED,
               "redirect" : URL('sample_set', 'all', vars={'type': defs.SET_TYPE_PATIENT, 'page': 0}, scheme=True)}
        log.info(res)
        return json.dumps(res, separators=(',',':'))
    
    # Get tasks in progress in scheduler
    current_task_ids=[]
    inspect = scheduler.control.inspect()
    inspect_task_lists = [inspect.scheduled(), inspect.active(), inspect.reserved()]
    for inspect_task_list in inspect_task_lists:
        for task_list in inspect_task_list.values():
            current_task_ids+=[task["args"][0] for task in task_list if "args" in task]
            
    # Get tasks in progress in DB
    in_progress_task_ids = db((db.scheduler_task.status != tasks.STATUS_FAILED) & 
                              (db.scheduler_task.status != tasks.STATUS_COMPLETED) & 
                              (db.scheduler_task.status != tasks.STATUS_TIMEOUT)).select(db.scheduler_task.id)
    
    # Set not corresponding tasks status to FAILED in DB
    dangling_task_ids = [in_progress_task.id for in_progress_task in in_progress_task_ids if in_progress_task.id not in current_task_ids]
    log.debug(f"{current_task_ids=}, {in_progress_task_ids=}")
    for dangling_task_id in dangling_task_ids:
        db.scheduler_task[dangling_task_id].update_record(status=tasks.STATUS_FAILED)
    
    res = {"redirect": "reload", "success": "true", "message": f"Dangling tasks set to failed: {dangling_task_ids}"}
    log.info(res)
    return json.dumps(res, separators=(',', ':'))
