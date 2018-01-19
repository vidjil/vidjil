# coding: utf8
import gluon.contrib.simplejson, datetime
import vidjil_utils
import time
import datetime
import json

if request.env.http_origin:
    response.headers['Access-Control-Allow-Origin'] = request.env.http_origin  
    response.headers['Access-Control-Allow-Credentials'] = 'true'
    response.headers['Access-Control-Max-Age'] = 86400

ACCESS_DENIED = "access denied"

def download():
    return response.download(request, db)


#
def confirm():
    if (auth.can_modify_patient(request.vars["id"]) ):
        log.debug('request patient deletion')
        return dict(message=T('confirm patient deletion'))
    else :
        res = {"message": ACCESS_DENIED}
        log.error(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))


#
def delete():
    if (auth.can_modify_patient(request.vars["id"]) ):
        patient = db.patient[request.vars["id"]]
        if patient is None:
            res = {"message": 'An error occured. This patient may have already been deleted'}
            log.error(res)
            return gluon.contrib.simplejson.dumps(res, separators=(',',':'))

        sample_set_id = patient.sample_set_id

        #delete data file 
        query = db( (db.sample_set_membership.sample_set_id == sample_set_id)
                    & (db.sequence_file.id == db.sample_set_membership.sequence_file_id)
                ).select(db.sequence_file.id) 
        for row in query :
            db(db.results_file.sequence_file_id == row.id).delete()
        
        #delete sequence file
        query = db((db.sequence_file.id == db.sample_set_membership.sequence_file_id)
            & (db.sample_set_membership.sample_set_id == sample_set_id)
            ).select(db.sequence_file.id)
        for row in query :
            db(db.sequence_file.id == row.id).delete()

        #delete patient
        db(db.patient.id == request.vars["id"]).delete()
        
        #delete patient sample_set
        db(db.sample_set.id == sample_set_id).delete()

        res = {"redirect": "patient/index",
               "success": "true",
               "message": "patient ("+str(request.vars["id"])+") deleted"}
        log.info(res, extra={'user_id': auth.user.id, 'record_id': request.vars["id"], 'table_name': 'patient'})
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
    else :
        res = {"message": ACCESS_DENIED}
        log.error(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))

    


