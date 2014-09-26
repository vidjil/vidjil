# coding: utf8
import gluon.contrib.simplejson
if request.env.http_origin:
    response.headers['Access-Control-Allow-Origin'] = request.env.http_origin  
    response.headers['Access-Control-Allow-Credentials'] = 'true'
    response.headers['Access-Control-Max-Age'] = 86400
    

## return admin_panel
def index():
    if auth.has_membership("admin"):
        return dict(message=T(''))

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
        log.info(res)
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
