# coding: utf8
import gluon.contrib.simplejson, re
import os.path, subprocess
import vidjil_utils

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
        
        return dict(worker = len(db().select(db.scheduler_worker.ALL)),
                    queued = len(db(db.scheduler_task.status=='QUEUED').select()),                    
                    assigned = len(db(db.scheduler_task.status=='ASSIGNED').select()),
                    running = len(db(db.scheduler_task.status=='RUNNING').select()),
                    uptime=uptime,
                    disk_use=disk_use
                    )


def monitor():
    # External monitor
    return dict (worker = len(db().select(db.scheduler_worker.ALL)),
                 queued = len(db(db.scheduler_task.status=='QUEUED').select()),
                 assigned = len(db(db.scheduler_task.status=='ASSIGNED').select()),
                 running = len(db(db.scheduler_task.status=='RUNNING').select()))
    
def worker():
    if auth.has_membership("admin"):
        return dict(message=T(''))
    
    
def log():
    if auth.has_membership("admin"):
        
        
        lines = []
        file = open(defs.DIR_LOG+request.vars["file"])
        
        if "filter" not in request.vars :
            request.vars["filter"] = ""
            
        for row in reversed(file.readlines()) :

            if vidjil_utils.filter(row, request.vars["filter"]) :
                line = {}

                tmp = re.split('\t+| +', row) 

                line["date"] = tmp[1]
                line["date2"] = tmp[2].split(',')[0]
                line["type"] = tmp[3]
                line["file"] = tmp[5]

                if tmp[6] != "Creating":
                    line["user"] = tmp[7]
                    line["mes"] = ""
                    for i in range(8,len(tmp)):
                        line["mes"] += tmp[i] + " "
                else:
                    line["user"] = ""
                    line["mes"] = ""
                    for i in range(6,len(tmp)):
                        line["mes"] += tmp[i] + " "

                lines.append(line)

                if len(lines) >= 100 :
                    return dict(lines = lines)
            
        return dict(lines = lines
                    )

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
