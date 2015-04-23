# coding: utf8
import gluon.contrib.simplejson, re
import os.path, subprocess
import vidjil_utils
from collections import defaultdict

MAX_LOG_LINES = 500

if request.env.http_origin:
    response.headers['Access-Control-Allow-Origin'] = request.env.http_origin  
    response.headers['Access-Control-Allow-Credentials'] = 'true'
    response.headers['Access-Control-Max-Age'] = 86400
    

## return admin_panel
def index():
    if auth.is_admin():
        p = subprocess.Popen(["uptime"], stdout=subprocess.PIPE)
        uptime, err = p.communicate()
        
        p = subprocess.Popen(["df", "-h"], stdout=subprocess.PIPE)
        disk_use, err = p.communicate()
        
        d = monitor()
        return dict(d,
                    uptime=uptime,
                    disk_use=disk_use
                    )


def monitor():
    """
    >>> monitor().has_key('worker')
    True
    
    """
    # External monitor

    last_results = ''
    for res in db(db.scheduler_task.id == db.results_file.scheduler_task_id).select(orderby=~db.results_file.id,
                                                                                    limitby=(0,10)):
        last_results += res.scheduler_task.status[0]


    return dict (worker = len(db().select(db.scheduler_worker.ALL)),
                 queued = len(db(db.scheduler_task.status=='QUEUED').select()),
                 assigned = len(db(db.scheduler_task.status=='ASSIGNED').select()),
                 running = len(db(db.scheduler_task.status=='RUNNING').select()),
                 last_results = last_results)
    
    
def showlog():
    if auth.is_admin():
        
        
        lines = []
        file = open(defs.DIR_LOG+request.vars["file"])
        log_format = request.vars['format'] if 'format' in request.vars else ''

        if log_format == 'raw':
            return {'raw': ''.join(file.readlines()), 'format': log_format}

        if "filter" not in request.vars :
            request.vars["filter"] = ""
            
        for row in reversed(file.readlines()) :
            parsed = False

            if not vidjil_utils.filter(row, request.vars["filter"]) :
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

                    line["mes"] = vidjil_utils.log_links(line["mes"])

            if not parsed:
                line = { 'mes': row, 'date': '', 'date2': '', 'user': '', 'type':'', 'file':''}

            ### Stores log line
            lines.append(line)

            if len(lines) >= MAX_LOG_LINES :
                break
            
        return {'lines': lines, 'format': log_format}

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
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))

    
def make_backup():
    if auth.is_admin():
        
        db.export_to_csv_file(open(defs.DB_BACKUP_FILE, 'wb'))
                
        res = {"success" : "true", "message" : "DB backup -> %s" % defs.DB_BACKUP_FILE}
        log.admin(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
    
    
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
        db(db.sequence_file.patient_id == None).delete();
        
        flist += "fix results_file "
        db(db.results_file.sequence_file_id == None).delete()
    
        flist += "fix fused file "
        for row in db(db.fused_file.fuse_date == None).select() :
            flist += " : " + str(row.id)
            db.fused_file[row.id] = dict(fuse_date = "1970-01-01 00:00:00")
        
        res = {"success" : "true", "message" : "DB repaired: " + flist}
        log.admin(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
