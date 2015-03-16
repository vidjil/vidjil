# coding: utf8
import gluon.contrib.simplejson, re
import os.path, subprocess
import vidjil_utils
from collections import defaultdict

if request.env.http_origin:
    response.headers['Access-Control-Allow-Origin'] = request.env.http_origin  
    response.headers['Access-Control-Allow-Credentials'] = 'true'
    response.headers['Access-Control-Max-Age'] = 86400
    

## return admin_panel
def index():
    if auth.has_membership("admin"):
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
    
    
def log():
    if auth.has_membership("admin"):
        
        
        lines = []
        file = open(defs.DIR_LOG+request.vars["file"])
        log_format = request.vars['format'] if 'format' in request.vars else ''

        if "filter" not in request.vars :
            request.vars["filter"] = ""
            
        for row in reversed(file.readlines()) :

            if not vidjil_utils.filter(row, request.vars["filter"]) :
                continue

            if not log_format: # == 'vidjil'
                line = { 'mes': row, 'date': '', 'date2': '', 'user': '', 'type':'', 'file':''}

            else:
                # Parses lines such as
                # [11889] 2015-02-01 12:01:28,367     INFO - default.py:312 1.23.45.67/user/Toto <Toto> xxxxx log message
                # [11889] 2015-02-01 12:01:28,367     INFO - default.py:312 1.23.45.67 log message
                # [11889] 2015-02-01 12:01:28,367     INFO - default.py:312 log message
                line = {}

                tmp = re.split('\t+| +', row) 

                line["date"] = tmp[1]
                line["date2"] = tmp[2].split(',')[0]
                line["type"] = tmp[3]
                line["file"] = tmp[5]

                if tmp[6] != "Creating":
                    if '<' in tmp[8]:
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

            ### Stores log line
            lines.append(line)

            if len(lines) >= 100 :
                break
            
        return {'lines': lines, 'format': log_format}

## to use after change in the upload folder
def repair_missing_files():
    if auth.has_membership("admin"):
        
        flist = ""
        for row in db(db.sequence_file.id>0 and db.sequence_file.data_file != None).select() : 
            seq_file = defs.DIR_SEQUENCES+row.data_file
            
            if not os.path.exists(seq_file) :
                db.sequence_file[row.id] = dict(data_file = None)
                flist += " : " + row.filename
            else :
                size = os.path.getsize(seq_file)
                db.sequence_file[row.id] = dict(size_file = size)
                
        res = {"success" : "true", "message" : "references to missing files have been removed from the database"+flist}
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
