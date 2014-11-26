# coding: utf8
import gluon.contrib.simplejson, datetime
if request.env.http_origin:
    response.headers['Access-Control-Allow-Origin'] = request.env.http_origin  
    response.headers['Access-Control-Allow-Credentials'] = 'true'
    response.headers['Access-Control-Max-Age'] = 86400

ACCESS_DENIED = "access denied"

## return patient file list
##
def info():
    log.debug('patient (%s)' % request.vars["id"])
    if (auth.has_permission('read', 'patient', request.vars["id"]) ):
        return dict(message=T('patient'))
    else :
        res = {"message": ACCESS_DENIED}
        log.error(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))



## return patient list
def index():
    if not auth.user : 
        res = {"redirect" : "default/user/login"}
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
    log.debug('patient list')

    count = db.sequence_file.id.count()
    isAdmin = auth.has_membership("admin")
    
    ##retrieve patient list 
    query = db(
        (auth.accessible_query('read', db.patient) | auth.accessible_query('admin', db.patient) ) 
    ).select(
        db.patient.ALL,
        count,
        left=db.sequence_file.on(db.patient.id == db.sequence_file.patient_id),
        groupby=db.patient.id
    )
    
    for row in query :
        
        ##add confs info for each patient
        row.confs=""
        co = db.fused_file.id.count()
        query_conf = db( db.fused_file.patient_id == row.patient.id ).select(db.fused_file.config_id, co, groupby=db.fused_file.config_id).sort(lambda row: co)
        
        for row2 in query_conf:
            row.confs += " " + db.config[row2.fused_file.config_id].name
        
        row.most_used_conf = -1
        if len(query_conf) > 0 :
            row.most_used_conf = query_conf[0].fused_file.config_id

        ##add groups info for each patient
        row.groups=""
        for row3 in db( 
           (db.auth_permission.name == "read") &
           (db.auth_permission.table_name == "patient") &
           (db.auth_permission.record_id == row.patient.id)
          ).select( orderby=db.auth_permission.group_id, distinct=True )  :
            if db.auth_permission[row3.id].group_id > 2:
                row.groups += " " + str(db.auth_permission[row3.id].group_id)
    
    ##sort result
    if request.vars["sort"] == "configs" :
        query = query.sort(lambda row : row.confs)
    elif request.vars["sort"] == "groups" :
        query = query.sort(lambda row : row.groups)
    elif request.vars["sort"] == "files" :
        query = query.sort(lambda row : row[count])
    elif "sort" in request.vars:
        query = query.sort(lambda row : row.patient[request.vars["sort"]])
    
    return dict(query = query,
                count = count,
                isAdmin = isAdmin)



## return form to create new patient
def add(): 
    if (auth.has_permission('create', 'patient') ):
        return dict(message=T('add patient'))
    else :
        res = {"message": ACCESS_DENIED}
        log.error(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))



## create a patient if the html form is complete
## need ["first_name", "last_name", "birth_date", "info"]
## redirect to patient list if success
## return a flash error message if fail
def add_form(): 
    if (auth.has_permission('create', 'patient') ):
        
        error = ""
        if request.vars["first_name"] == "" :
            error += "first name needed, "
        if request.vars["last_name"] == "" :
            error += "last name needed, "
        try:
            datetime.datetime.strptime(""+request.vars['birth'], '%Y-%m-%d')
        except ValueError:
            error += "date missing or wrong format"

        if error=="" :
            id = db.patient.insert(first_name=request.vars["first_name"],
                                   last_name=request.vars["last_name"],
                                   birth=request.vars["birth"],
                                   info=request.vars["info"],
                                   id_label=request.vars["id_label"])


            user_group = auth.user_group(auth.user.id)
            admin_group = db(db.auth_group.role=='admin').select().first().id
            
            #patient creator automaticaly have all rights 
            auth.add_permission(user_group, 'admin', db.patient, id)
            auth.add_permission(user_group, 'read', db.patient, id)
            
            #tmp: share rights with users of the same group
            for g in auth.user_groups :
                auth.add_permission(g, 'admin', db.patient, id)
                auth.add_permission(g, 'read', db.patient, id)
            

            patient_name = request.vars["first_name"] + ' ' + request.vars["last_name"]

            res = {"redirect": "patient/info",
                   "args" : { "id" : id },
                   "message": patient_name + ": patient added"}
            log.info(res)
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
    if (auth.has_permission('admin', 'patient', request.vars["id"]) ):
        return dict(message=T('edit patient'))
    else :
        res = {"message": ACCESS_DENIED}
        log.error(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))



## check edit form
## need ["first_name", "last_name", "birth_date", "info"]
## redirect to patient list if success
## return a flash error message if fail
def edit_form(): 
    if (auth.has_permission('admin', 'patient', request.vars["id"]) ):
        error = ""
        if request.vars["first_name"] == "" :
            error += "first name needed, "
        if request.vars["last_name"] == "" :
            error += "last name needed, "
        try:
            datetime.datetime.strptime(""+request.vars['birth'], '%Y-%m-%d')
        except ValueError:
            error += "date missing or wrong format"
        if request.vars["id"] == "" :
            error += "patient id needed, "

        if error=="" :
            db.patient[request.vars["id"]] = dict(first_name=request.vars["first_name"],
                                                   last_name=request.vars["last_name"],
                                                   birth=request.vars["birth"],
                                                   info=request.vars["info"],
                                                   id_label=request.vars["id_label"]
                                                   )

            res = {"redirect": "back",
                   "message": "patient %s %s edited" % (request.vars["first_name"], request.vars["last_name"])}
            log.info(res)
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
    if (auth.has_permission('admin', 'patient', request.vars["id"]) ):
        log.debug('request patient deletion')
        return dict(message=T('confirm patient deletion'))
    else :
        res = {"message": ACCESS_DENIED}
        log.error(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))


#
def delete():
    if (auth.has_permission('admin', 'patient', request.vars["id"]) ):
        import shutil, os.path
        #delete data file 
        query = db( (db.sequence_file.patient_id==request.vars["id"])).select() 
        for row in query :
            db(db.results_file.sequence_file_id == row.id).delete()

        #delete sequence file
        db(db.sequence_file.patient_id == request.vars["id"]).delete()

        #delete patient
        db(db.patient.id == request.vars["id"]).delete()

        res = {"redirect": "patient/index",
               "success": "true",
               "message": "patient ("+request.vars["id"]+") deleted"}
        log.info(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
    else :
        res = {"message": ACCESS_DENIED}
        log.error(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))

    
#
def permission(): 
    if (auth.has_permission('admin', 'patient', request.vars["id"]) ):
        return dict(message=T('permission'))
    else :
        res = {"message": ACCESS_DENIED}
        log.error(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))



#
def remove_permission():
    if (auth.has_permission('admin', 'patient', request.vars["patient_id"]) ):
        error = ""
        if request.vars["group_id"] == "" :
            error += "missing group_id, "
        if request.vars["patient_id"] == "" :
            error += "missing patient_id, "

        if error=="":
            auth.del_permission(request.vars["group_id"], 'admin', db.patient, request.vars["patient_id"])
            auth.del_permission(request.vars["group_id"], 'read', db.patient, request.vars["patient_id"])

        res = {"redirect" : "patient/permission" , 
               "args" : { "id" : request.vars["patient_id"]},
               "message" : "access removed to '%s'" % request.vars["group_id"]}
        log.info(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
    else :
        res = {"message": ACCESS_DENIED}
        log.error(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))



#
def change_permission():
    if (auth.has_permission('admin', 'patient', request.vars["patient_id"]) ):
        auth.add_permission(request.vars["group_id"], request.vars["permission"], db.patient, request.vars["patient_id"])

        res = {"redirect" : "patient/permission" , 
               "args" : { "id" : request.vars["patient_id"]},
               "message" : "access '%s' granted to '%s'" % (request.vars["permission"], request.vars["group_id"])}
        log.info(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
    else :
        res = {"message": ACCESS_DENIED}
        log.error(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
