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

## return form to create new patient
def form():
    # edit patient
    if("id" in request.vars and auth.can_modify_patient(request.vars["id"])):
        groups = [get_set_group(defs.SET_TYPE_PATIENT, request.vars["id"])]
        message = 'edit patient'
        max_group = None

    #new patient
    elif (auth.can_create_patient()):
        creation_group_tuple = get_default_creation_group(auth)
        groups = creation_group_tuple[0]
        max_group = creation_group_tuple[1]
        message = 'add patient'
    else :
        res = {"message": ACCESS_DENIED}
        log.error(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
    return dict(message=T(message),
                groups=groups,
                master_group=max_group,
                patients=[db.patient[request.vars["id"]]])



## create a patient if the html form is complete
## need ["first_name", "last_name", "birth_date", "info"]
## redirect to patient list if success
## return a flash error message if fail
def submit():
    data = json.loads(request.vars['data'], encoding='utf-8')
    mf = ModelFactory()
    helper = mf.get_instance('patient')
    messages = []

    error = False
    for p in data['patient']:
        p['error'] = helper.validate(p)
        if len(p['error']) > 0:
            error = True
            continue

        register = False
        reset = False

        patient_name = "%s %s" % (p['first_name'], p['last_name'])

        # edit patient
        if (p['id'] != "" and auth.can_modify_patient(p['id'])):
            id = p["id"]
            patient = db.patient[id]
            db.patient[id] = p

            if (patient.info != p['info']):
                group_id = get_set_group(defs.SET_TYPE_PATIENT, id)
                register = True
                reset = True

            messages.append("%s (%s): patient edited" % (patient_name, id))

        # add patient
        elif (auth.can_create_patient()):

            id_sample_set = db.sample_set.insert(sample_type=defs.SET_TYPE_PATIENT)

            p['creator'] = auth.user_id
            p['sample_set_id'] = id_sample_set
            id = db.patient.insert(**p)

            group_id = int(data["group"])

            register = True

            #patient creator automaticaly has all rights
            auth.add_permission(group_id, PermissionEnum.access.value, db.patient, id)

            messages.append("(%s) patient %s added" % (id_sample_set, patient_name))

            if (id % 100) == 0:
                mail.send(to=defs.ADMIN_EMAILS,
                subject="[Vidjil] %d" % id,
                message="The %dth patient has just been created." % id)

        else :
            p['error'].append("permission denied")
            error = True

        if register:
            register_tags(db, defs.SET_TYPE_PATIENT, p["id"], p["info"], group_id, reset=reset)

    if not error:
        # TODO proper logging of all events
        #log.info(res, extra={'user_id': auth.user.id, 'record_id': id, 'table_name': 'patient'})
        res = {"redirect": "sample_set/all",
                "message": "successfully added/edited patient(s)"}
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
    else:
        response.view = 'patient/form.html'
        return dict(message=T("an error occured"),
                groups=[{'name': 'foobar', 'id': int(data['group'])}],
                    master_group=data['group'],
                    patients=data['patient'])

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

    


