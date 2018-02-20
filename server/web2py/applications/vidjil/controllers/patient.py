# coding: utf8
import gluon.contrib.simplejson, datetime
import vidjil_utils
import time
import datetime

if request.env.http_origin:
    response.headers['Access-Control-Allow-Origin'] = request.env.http_origin  
    response.headers['Access-Control-Allow-Credentials'] = 'true'
    response.headers['Access-Control-Max-Age'] = 86400

ACCESS_DENIED = "access denied"

## return form to create new patient
def add(): 
    if (auth.can_create_patient()):
        creation_group_tuple =  get_default_creation_group(auth)
        groups = creation_group_tuple[0]
        max_group = creation_group_tuple[1]
        return dict(message=T('add patient'), groups=groups, master_group=max_group)
    else :
        res = {"message": ACCESS_DENIED}
        log.error(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))



## create a patient if the html form is complete
## need ["first_name", "last_name", "birth_date", "info"]
## redirect to patient list if success
## return a flash error message if fail
def add_form(): 
    if (auth.can_create_patient()):
        
        error = ""
        if request.vars["first_name"] == "" :
            error += "first name needed, "
        if request.vars["last_name"] == "" :
            error += "last name needed, "
        if request.vars["birth"] != "" :
            try:
                datetime.datetime.strptime(""+request.vars['birth'], '%Y-%m-%d')
            except ValueError:
                error += "date (wrong format)"

        if error=="" :
            id_sample_set = db.sample_set.insert(sample_type=defs.SET_TYPE_PATIENT)
            
            id = db.patient.insert(first_name=request.vars["first_name"],
                                   last_name=request.vars["last_name"],
                                   sample_set_id=id_sample_set,
                                   birth=request.vars["birth"],
                                   info=request.vars["info"],
                                   id_label=request.vars["id_label"],
                                   creator=auth.user_id)

            user_group = int(request.vars["patient_group"])
            admin_group = db(db.auth_group.role=='admin').select().first().id

            register_tags(db, defs.SET_TYPE_PATIENT, id, request.vars["info"], user_group)
            
            #patient creator automaticaly has all rights 
            auth.add_permission(user_group, PermissionEnum.access.value, db.patient, id)
            
            patient_name = request.vars["first_name"] + ' ' + request.vars["last_name"]

            res = {"redirect": "sample_set/index",
                   "args" : { "id" : id_sample_set },
                   "message": "(%s) patient %s added" % (id_sample_set, patient_name) }
            log.info(res, extra={'user_id': auth.user.id, 'record_id': id, 'table_name': 'patient'})

            if (id % 100) == 0:
                mail.send(to=defs.ADMIN_EMAILS,
                subject="[Vidjil] %d" % id,
                message="The %dth patient has just been created." % id)

            return gluon.contrib.simplejson.dumps(res, separators=(',',':'))

        else :
            res = {"success" : "false",
                   "message" : error}
            log.error(res)
            return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
        
    else :
        res = {"message": ACCESS_DENIED}
        log.error(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))



## return edit form 
def edit(): 
    if (auth.can_modify_patient(request.vars["id"]) ):
        group_id = get_set_group(defs.SET_TYPE_PATIENT, request.vars["id"])
        return dict(message=T('edit patient'), group_id=group_id)
    else :
        res = {"message": ACCESS_DENIED}
        log.error(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))



## check edit form
## need ["first_name", "last_name", "birth_date", "info"]
## redirect to patient list if success
## return a flash error message if fail
def edit_form(): 
    if (auth.can_modify_patient(request.vars["id"]) ):
        error = ""
        if request.vars["first_name"] == "" :
            error += "first name needed, "
        if request.vars["last_name"] == "" :
            error += "last name needed, "
        if request.vars["birth"] != "" :
            try:
                datetime.datetime.strptime(""+request.vars['birth'], '%Y-%m-%d')
            except ValueError:
                error += "date (wrong format)"
        if request.vars["id"] == "" :
            error += "patient id needed, "

        if error=="" :
            patient = db.patient[request.vars["id"]]
            db.patient[request.vars["id"]] = dict(first_name=request.vars["first_name"],
                                                   last_name=request.vars["last_name"],
                                                   birth=request.vars["birth"],
                                                   info=request.vars["info"],
                                                   id_label=request.vars["id_label"]
                                                   )

            if (patient.info != request.vars["info"]):
                group_id = get_set_group(defs.SET_TYPE_PATIENT, request.vars["id"])
                register_tags(db, defs.SET_TYPE_PATIENT, request.vars["id"], request.vars["info"], group_id, reset=True)

            res = {"redirect": "back",
                   "message": "%s %s (%s): patient edited" % (request.vars["first_name"], request.vars["last_name"], request.vars["id"])}
            log.info(res, extra={'user_id': auth.user.id, 'record_id': request.vars['id'], 'table_name': 'patient'})
            return gluon.contrib.simplejson.dumps(res, separators=(',',':'))

        else :
            res = {"success" : "false", "message" : error}
            log.error(res)
            return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
    else :
        res = {"message": ACCESS_DENIED}
        log.error(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))


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

    


