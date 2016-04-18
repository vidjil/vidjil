# coding: utf8
import gluon.contrib.simplejson, datetime
import vidjil_utils
import time

if request.env.http_origin:
    response.headers['Access-Control-Allow-Origin'] = request.env.http_origin  
    response.headers['Access-Control-Allow-Credentials'] = 'true'
    response.headers['Access-Control-Max-Age'] = 86400

ACCESS_DENIED = "access denied"



## return run list
def index():
    start = time.time()
    if not auth.user : 
        res = {"redirect" : URL('default', 'user', args='login', scheme=True, host=True,
                            vars=dict(_next=URL('run', 'index', scheme=True, host=True)))
            }
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
    
    isAdmin = auth.is_admin()
    
    
    ##retrieve run list 
    query_run = db(
        auth.accessible_query('read', db.run)
    ).select(
        db.run.ALL,
        orderby = ~db.run.id
    )
    result = {}
    
    for i, row in enumerate(query_run) :
        result[row.id] = {
            "id" :int(row.id),
            "sample_set_id" : int(row.sample_set_id),
            "name" : row.name,
            "has_admin_permission" : False,
            "run_date" : row.run_date,
            "info" : row.info,
            "creator" : row.creator,
            "confs" : "",
            "conf_list" : [],
            "conf_id_list" : [-1],
            "most_used_conf" : "",
            "groups" : "",
            "group_list" : [],
            "file_count" : 0,
            "size" : 0
        }
        
    keys = result.keys() 
    
    
    #retrieve admin permission
    query_admin_permission = db(
        (db.auth_permission.name == "admin") & 
        (db.auth_permission.table_name == "run") &
        (db.run.id == db.auth_permission.record_id ) &
        (auth.user_group() == db.auth_permission.group_id )
    ).select(
        db.run.ALL, db.auth_permission.ALL
    )

    for i, row in enumerate(query_admin_permission) :
        if row.run.id in keys :
            result[row.run.id]['has_admin_permission'] = True
            
            
    #retrieve creator name
    query_creator = db(
        db.run.creator == db.auth_user.id
    ).select(
        db.run.id, db.auth_user.last_name
    )
    for i, row in enumerate(query_creator) :
        if row.run.id in keys :
            result[row.run.id]['creator'] = row.auth_user.last_name
       
    
    #retrieve samples informations
    query_sample = db(
        (db.run.sample_set_id == db.sample_set.id)
        &(db.sample_set_membership.sample_set_id == db.sample_set.id)
        &(db.sequence_file.id == db.sample_set_membership.sequence_file_id)
    ).select(
        db.run.id, db.sequence_file.size_file
    )
    
    for i, row in enumerate(query_sample) :
        if row.run.id in keys :
            result[row.run.id]['file_count'] += 1
            result[row.run.id]['size'] += row.sequence_file.size_file
            
    #retrieve configs
    query3 = db(
        (db.run.sample_set_id == db.fused_file.sample_set_id) &
        (db.fused_file.config_id == db.config.id) &
        (auth.accessible_query('read', db.config) | auth.accessible_query('admin', db.config) )
    ).select(
        db.run.id, db.config.name, db.config.id, db.fused_file.fused_file
    )
    
    for i, row in enumerate(query3) :
        if row.run.id in keys :
            result[row.run.id]['conf_list'].append({'id': row.config.id, 'name': row.config.name, 'fused_file': row.fused_file.fused_file})
            result[row.run.id]['conf_id_list'].append(row.config.id)
    
    #retrieve list of users with read permission
    query4 = db(
        ((db.run.id == db.auth_permission.record_id) | (db.auth_permission.record_id == 0)) &
        (db.auth_permission.table_name == 'patient') &
        (db.auth_permission.name == 'read') &
        (db.auth_group.id == db.auth_permission.group_id)
    ).select(
        db.run.id, db.auth_group.role
    )
    for i, row in enumerate(query4) :
        if row.run.id in keys :
            result[row.run.id]['group_list'].append(row.auth_group.role.replace('user_','u'))

    #retrieve anon permissions
    query5 = db(
        (db.auth_permission.name == "anon") &
        (db.auth_permission.table_name == "patient") &
        (db.run.id == db.auth_permission.record_id ) &
        (db.auth_group.id == db.auth_permission.group_id ) &
        (db.auth_membership.user_id == auth.user_id) &
        (db.auth_membership.group_id == db.auth_group.id)
    ).select(
        db.patient.id
    )
    for i, row in enumerate(query5) :
        if row.id in keys :
            result[row.id]['anon_allowed'] = True
        
        
    for key, row in result.iteritems():
        row['most_used_conf'] = max(set(row['conf_id_list']), key=row['conf_id_list'].count)
        #row['confs'] = ", ".join(list(set(row['conf_list']))) 
        row['groups'] = ", ".join(filter(lambda g: g != 'admin', set(row['group_list'])))
        
    result = result.values()

    ##sort result
    reverse = False
    if request.vars["reverse"] == "true" :
        reverse = True
    if request.vars["sort"] == "configs" :
        result = sorted(result, key = lambda row : row['confs'], reverse=reverse)
    elif request.vars["sort"] == "groups" :
        result = sorted(result, key = lambda row : row['groups'], reverse=reverse)
    elif request.vars["sort"] == "files" :
        result = sorted(result, key = lambda row : row['file_count'], reverse=reverse)
    elif "sort" in request.vars:
        result = sorted(result, key = lambda row : row[request.vars["sort"]], reverse=reverse)
    else:
        result = sorted(result, key = lambda row : row['id'], reverse=not reverse)

    ##filter
    if "filter" not in request.vars :
        request.vars["filter"] = ""
    

    log.debug("run list (%.3fs) %s" % (time.time()-start, request.vars["filter"]))

    
    return dict(query = result,
                isAdmin = isAdmin,
                reverse = False)




## return form to create new run
def add(): 
    if (auth.can_create_patient()):
        sequencer_list = db(
            db.run.id>0
        ).select(
            db.run.sequencer,
            distinct=True
        )
		
	pcr_list = db(
		db.run.id>0
	).select(
		db.run.pcr,
		distinct=True
	)
		
        return dict(message=T('add run'),
				   sequencer_list = sequencer_list,
				   pcr_list = pcr_list)
    else :
        res = {"message": ACCESS_DENIED}
        log.error(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))



## create a run if the html form is complete
## need ["name", "run_date"]
## redirect to run list if success
## return a flash error message if fail
def add_form(): 
    if (auth.can_create_patient()):
        
        error = ""
        if request.vars["name"] == "" :
            error += "name needed, "
            
        if request.vars["run_date"] != "" :
            try:
                datetime.datetime.strptime(""+request.vars['run_date'], '%Y-%m-%d')
            except ValueError:
                error += "date (wrong format)"

        if error=="" :
            id_sample_set = db.sample_set.insert(sample_type="run")
            
            id = db.run.insert(name=request.vars["name"],
                                   sample_set_id=id_sample_set,
                                   run_date=request.vars["run_date"],
                                   info=request.vars["info"],
                                   id_label=request.vars["id_label"],
								   sequencer=request.vars["sequencer"],
								   pcr=request.vars["pcr"],
                                   creator=auth.user_id)


            user_group = auth.user_group(auth.user.id)
            admin_group = db(db.auth_group.role=='admin').select().first().id
            
            #patient creator automaticaly has all rights 
            auth.add_permission(user_group, 'admin', db.run, id)
            auth.add_permission(user_group, 'read', db.run, id)
            auth.add_permission(user_group, 'anon', db.run, id)

            res = {"redirect": "run/index",
                   "args" : { "id" : id },
                   "message": request.vars["name"] + ": run added"}
            log.info(res)

            if (id % 100) == 0:
                mail.send(to=defs.ADMIN_EMAILS,
                subject="[Vidjil] %d" % id,
                message="The %dth run has just been created." % id)

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
    if (auth.can_modify_run(request.vars["id"]) ):
        sequencer_list = db(
            db.run.id>0
        ).select(
            db.run.sequencer,
            distinct=True
        )
		
	pcr_list = db(
		db.run.id>0
	).select(
		db.run.pcr,
		distinct=True
	)
		
        return dict(message=T('edit run'),
				   sequencer_list = sequencer_list,
				   pcr_list = pcr_list)
    else :
        res = {"message": ACCESS_DENIED}
        log.error(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))

    

## check edit form
## need ["name", "run_date", "info"]
## redirect to run list if success
## return a flash error message if fail
def edit_form(): 
    if (auth.can_modify_patient(request.vars["id"]) ):
        error = ""
        if request.vars["name"] == "" :
            error += "name needed, "
        if request.vars["run_date"] != "" :
            try:
                datetime.datetime.strptime(""+request.vars['run_date'], '%Y-%m-%d')
            except ValueError:
                error += "date (wrong format)"
        if request.vars["id"] == "" :
            error += "patient id needed, "

        if error=="" :
            db.patient[request.vars["id"]] = dict(name=request.vars["name"],
                                                   run_date=request.vars["run_date"],
                                                   info=request.vars["info"],
												   sequencer=request.vars["sequencer"],
												   pcr=request.vars["pcr"],
                                                   id_label=request.vars["id_label"]
                                                   )

            res = {"redirect": "back",
                   "message": "%s (%s): run edited" % (request.vars["name"], request.vars["id"])}
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

    
    
def confirm():
    if (auth.can_modify_run(request.vars["id"]) ):
        log.debug('request patient deletion')
        return dict(message=T('confirm patient deletion'))
    else :
        res = {"message": ACCESS_DENIED}
        log.error(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
    
def delete():
    if (auth.can_modify_run(request.vars["id"]) ):
        sample_set_id = db.run[request.vars["id"]].sample_set_id

        #delete data file 
        '''
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
        '''
        
        #delete patient
        db(db.run.id == request.vars["id"]).delete()
        
        #delete patient sample_set
        db(db.sample_set.id == sample_set_id).delete()

        res = {"redirect": "run/index",
               "success": "true",
               "message": "run ("+str(request.vars["id"])+") deleted"}
        log.info(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
    else :
        res = {"message": ACCESS_DENIED}
        log.error(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
    
    
    
def info():

    next_patient()
    patient = db.patient[request.vars["id"]]
    sample_set_id = patient.sample_set_id

    if request.vars["config_id"] and request.vars["config_id"] != "-1" and request.vars["config_id"] != "None":
        config_id = long(request.vars["config_id"])
        patient_name = vidjil_utils.anon_names(patient.id, patient.first_name, patient.last_name)
        config_name = db.config[request.vars["config_id"]].name

        fused = db(
            (db.fused_file.sample_set_id == sample_set_id)
            & (db.fused_file.config_id == config_id)
        )

        analysis = db(
            db.analysis_file.sample_set_id == sample_set_id
        ).select(orderby=~db.analysis_file.analyze_date)
        
        
        config = True
        fused_count = fused.count()
        fused_file = fused.select()
        fused_filename = patient_name +"_"+ config_name + ".data"
        analysis_count = len(analysis)
        analysis_file = analysis
        analysis_filename = patient_name+".analysis"
        
    else:
        config_id = -1
        config = False
        fused_count = 0
        fused_file = ""
        fused_filename = ""
        analysis_count = 0
        analysis_file = ""
        analysis_filename = ""

    if config :
	query =[]
	
        query2 = db(
                (db.sequence_file.id == db.sample_set_membership.sequence_file_id)
                & (db.sample_set_membership.sample_set_id == db.patient.sample_set_id)
                & (db.patient.id==request.vars["id"])
            ).select(
                left=db.results_file.on(
                    (db.results_file.sequence_file_id==db.sequence_file.id)
                    & (db.results_file.config_id==str(config_id) )
                ), 
                orderby = db.sequence_file.id|~db.results_file.run_date
            )
	previous=-1
	for row in query2 :
	    if row.sequence_file.id != previous : 
		query.append(row)
		previous=row.sequence_file.id

    else:

        query = db(
                (db.sequence_file.id == db.sample_set_membership.sequence_file_id)
                & (db.sample_set_membership.sample_set_id == db.patient.sample_set_id)
                & (db.patient.id==request.vars["id"])
            ).select(
                left=db.results_file.on(
                    (db.results_file.sequence_file_id==db.sequence_file.id)
                    & (db.results_file.config_id==str(config_id) )
                )
            )


    
    log.debug('patient (%s)' % request.vars["id"])
    if (auth.can_view_patient(request.vars["id"]) ):
        return dict(query=query,
                    patient=patient,
                    birth=vidjil_utils.anon_birth(request.vars["id"], auth.user.id),
                    config_id=config_id,
                    fused_count=fused_count,
                    fused_file=fused_file,
                    fused_filename=fused_filename,
                    analysis_count=analysis_count,
                    analysis_file = analysis_file,
                    analysis_filename = analysis_filename,
                    config=config)
    
    
    else :
        res = {"message": ACCESS_DENIED}
        log.error(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
