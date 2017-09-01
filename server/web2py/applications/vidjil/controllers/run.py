# coding: utf8
import gluon.contrib.simplejson, datetime
import vidjil_utils
from tag import *
import time

if request.env.http_origin:
    response.headers['Access-Control-Allow-Origin'] = request.env.http_origin  
    response.headers['Access-Control-Allow-Credentials'] = 'true'
    response.headers['Access-Control-Max-Age'] = 86400

ACCESS_DENIED = "access denied"

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

        creation_group_tuple =  get_default_creation_group(auth)
        groups = creation_group_tuple[0]
        max_group = creation_group_tuple[1]
		
        return dict(message=T('add run'),
				   sequencer_list = sequencer_list,
				   pcr_list = pcr_list, groups=groups, master_group=max_group)
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
            id_sample_set = db.sample_set.insert(sample_type=defs.SET_TYPE_RUN)
            
            id = db.run.insert(name=request.vars["name"],
                                   sample_set_id=id_sample_set,
                                   run_date=request.vars["run_date"],
                                   info=request.vars["info"],
                                   id_label=request.vars["id_label"],
								   sequencer=request.vars["sequencer"],
								   pcr=request.vars["pcr"],
                                   creator=auth.user_id)

            user_group = int(request.vars["run_group"])
            admin_group = db(db.auth_group.role=='admin').select().first().id

            register_tags(db, defs.SET_TYPE_RUN, id, request.vars["info"], user_group)
            
            #patient creator automaticaly has all rights 
            auth.add_permission(user_group, PermissionEnum.access.value, db.run, id)

            res = {"redirect": "sample_set/all",
                   "args" : { "type" : 'run' },
                   "message": request.vars["name"] + ": run added"}
            log.info(res, extra={'user_id': auth.user.id, 'record_id': id, 'table_name': 'run'})

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
    if (auth.can_modify_run(request.vars["id"]) ):
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
            run = db.run[request.vars["id"]]
            db.run[request.vars["id"]] = dict(name=request.vars["name"],
                                                   run_date=request.vars["run_date"],
                                                   info=request.vars["info"],
												   sequencer=request.vars["sequencer"],
												   pcr=request.vars["pcr"],
                                                   id_label=request.vars["id_label"]
                                                   )

            group_id = get_set_group(defs.SET_TYPE_RUN, request.vars["id"])
            if (run.info != request.vars["info"]):
                register_tags(db, defs.SET_TYPE_RUN, request.vars["id"], request.vars["info"], group_id, reset=True)

            res = {"redirect": "back",
                   "message": "%s (%s): run edited" % (request.vars["name"], request.vars["id"])}
            log.info(res, extra={'user_id': auth.user.id, 'record_id': request.vars["id"], 'table_name': 'run'})
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

        res = {"redirect": "sample_set/all",
               "args" : { "type" : 'run' },
               "success": "true",
               "message": "run ("+str(request.vars["id"])+") deleted"}
        log.info(res, extra={'user_id': auth.user.id, 'record_id': request.vars['id'], 'table_name': 'run'})
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
    if (auth.can_view('patient', request.vars["id"]) ):
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
