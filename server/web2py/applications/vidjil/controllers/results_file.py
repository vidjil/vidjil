# coding: utf8
import gluon.contrib.simplejson
if request.env.http_origin:
    response.headers['Access-Control-Allow-Origin'] = request.env.http_origin  
    response.headers['Access-Control-Allow-Credentials'] = 'true'
    response.headers['Access-Control-Max-Age'] = 86400
    

## return admin_panel
def index():
    if auth.has_membership("admin"):

        query = db(
            (db.results_file.sequence_file_id==db.sequence_file.id)
            & (db.sequence_file.patient_id==db.patient.id)
            & (db.results_file.config_id==db.config.id)
        ).select()
        
        for row in query :
            if row.results_file.scheduler_task_id is None :
                row.status = '' 
            else:
                row.status = db.scheduler_task[row.results_file.scheduler_task_id ].status 
            pass
        
        ##sort result
        if request.vars["sort"] == "name" :
            query = query.sort(lambda row : row.patient.last_name)
        elif request.vars["sort"] == "run_date" :
            query = query.sort(lambda row : row.results_file.run_date)
        elif request.vars["sort"] == "config" :
            query = query.sort(lambda row : row.config.name)
        elif request.vars["sort"] == "patient" :
            query = query.sort(lambda row : row.patient.last_name)
        elif request.vars["sort"] == "status" :
            query = query.sort(lambda row : row.status)
        elif "sort" in request.vars and request.vars["sort"] != "":
            query = query.sort(lambda row : row.sequence_file[request.vars["sort"]])

        ##filter
        if "filter" in request.vars and request.vars["filter"] != "":
            for row in query :
                row.string = (row.sequence_file.filename+row.config.name+row.patient.last_name+row.patient.first_name+row.sequence_file.producer+str(row.results_file.run_date)+row.status ).lower()
            query = query.find(lambda row : row.string.find(request.vars["filter"].lower()) != -1)
        else :
            request.vars["filter"] = ""
        
        return dict(query = query)

def run_all():
    if auth.has_membership("admin"):
        query = db(
                (db.results_file_file.sequence_file_id==db.sequence_file.id)
                & (db.results_file.config_id==db.config.id)
            ).select()

        for row in query:
            schedule_run(row.sequence_file.id, row.config.id)

        res = {"success" : "true",
               "message" : "rerun all"}
        log.warning(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))

## display run page result 
## need ["results_file_id"]
def info():
    if (auth.has_permission('admin', 'patient', db.sequence_file[db.results_file[request.vars["results_file_id"]].sequence_file_id].patient_id ) ):
        return dict(message=T('result info'))
    else :
        res = {"message": "acces denied"}
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
    
def confirm():
    if (auth.has_permission('admin', 'patient', db.sequence_file[db.results_file[request.vars["results_file_id"]].sequence_file_id].patient_id )
        & auth.has_permission("run", "results_file") ):
        return dict(message=T('result confirm'))
    else :
        res = {"message": "acces denied"}
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
    
#
def delete():
    if (auth.has_permission('admin', 'patient', db.sequence_file[db.results_file[request.vars["results_file_id"]].sequence_file_id].patient_id )
        & auth.has_permission("run", "results_file") ):
        
        config_id = db.results_file[request.vars["results_file_id"]].config_id
        patient_id = db.sequence_file[db.results_file[request.vars["results_file_id"]].sequence_file_id].patient_id
        
        #delete results_file
        db(db.results_file.id == request.vars["results_file_id"]).delete()
        
        #delete fused_file 
        count = db((db.patient.id == patient_id) & 
                   (db.sequence_file.patient_id == db.patient.id) &
                   (db.sequence_file.id == db.results_file.sequence_file_id) &
                   (db.results_file.config_id == config_id)
                   ).count()
        
        if count == 0 :
            db((db.fused_file.patient_id == patient_id ) &
               (db.fused_file.config_id == config_id)
               ).delete()
        
        res = {"redirect": "patient/info",
               "args" : { "id" : patient_id,
                          "config_id" : config_id},
               "success": "true",
               "message": "process ("+str(request.vars["results_file_id"])+") deleted"}
        log.info(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
    else :
        res = {"message": "acces denied"}
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
