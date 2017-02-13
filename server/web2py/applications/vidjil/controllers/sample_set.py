# coding: utf8
import gluon.contrib.simplejson, datetime
import vidjil_utils
import time

if request.env.http_origin:
    response.headers['Access-Control-Allow-Origin'] = request.env.http_origin  
    response.headers['Access-Control-Allow-Credentials'] = 'true'
    response.headers['Access-Control-Max-Age'] = 86400

ACCESS_DENIED = "access denied"




#
#
def next_sample_set():
    '''
    Process request, possibly changing request.vars['id'] depending on request.vars['next']
    '''
    if 'next' in request.vars:
        try:
            sample_type = db.sample_set[request.vars["id"]].sample_type
            
            for row in db( db[sample_type].sample_set_id == request.vars["id"] ).select() :
                current_id = row.id
            
            go_next = int(request.vars['next'])
            if go_next > 0:
                res = db((db[sample_type].id > current_id) & (auth.vidjil_accessible_query(PermissionEnum.read.value, db[sample_type]))).select(
                    db[sample_type].id, db[sample_type].sample_set_id, orderby=db[sample_type].id, limitby=(0,1))
            else:
                res = db((db[sample_type].id < current_id) & (auth.vidjil_accessible_query(PermissionEnum.read.value, db[sample_type]))).select(
                    db[sample_type].id, db[sample_type].sample_set_id, orderby=~db[sample_type].id, limitby=(0,1))
            if (len(res) > 0):
                request.vars["id"] = str(res[0].sample_set_id)
        except:
            pass

## return patient file list
##
def index():

    next_sample_set()
    if not auth.can_view_sample_set(request.vars["id"]):
        res = {"message": ACCESS_DENIED}
        log.error(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))

    sample_set = db.sample_set[request.vars["id"]]
    sample_set_id = sample_set.id
    factory = ModelFactory()
    helper = factory.get_instance(type=sample_set.sample_type)
    data = helper.get_data(sample_set_id)
    info_file = helper.get_info_dict(data)

    if request.vars["config_id"] and request.vars["config_id"] != "-1" and request.vars["config_id"] != "None":
        config_id = long(request.vars["config_id"])
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
        fused_filename = info_file["filename"] +"_"+ config_name + ".vidjil"
        analysis_count = len(analysis)
        analysis_file = analysis
        analysis_filename = info_file["filename"]+"_"+ config_name + ".analysis"
        
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
                & (db.sample_set_membership.sample_set_id == sample_set_id)
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
                & (db.sample_set_membership.sample_set_id == sample_set_id)
            ).select(
                left=db.results_file.on(
                    (db.results_file.sequence_file_id==db.sequence_file.id)
                    & (db.results_file.config_id==str(config_id) )
                )
            )

    query_pre_process = db( db.pre_process.id >0 ).select()
    pre_process_list = {}
    for row in query_pre_process:
        pre_process_list[row.id] = row.name
    
    log.debug('sample_set (%s)' % request.vars["id"])
    #if (auth.can_view_patient(request.vars["id"]) ):
    return dict(query=query,
                pre_process_list=pre_process_list,
                config_id=config_id,
                info=info_file,
                can_modify=auth.can_modify_sample_set(sample_set_id),
                can_upload=auth.can_upload_sample_set(sample_set_id),
                fused_count=fused_count,
                fused_file=fused_file,
                fused_filename=fused_filename,
                analysis_count=analysis_count,
                analysis_file = analysis_file,
                analysis_filename = analysis_filename,
                sample_type = db.sample_set[request.vars["id"]].sample_type,
                config=config)

## return a list of generic sample_sets
def all():
    start = time.time()
    if not auth.user :
        res = {"redirect" : URL('default', 'user', args='login', scheme=True, host=True,
                            vars=dict(_next=URL('run', 'index', scheme=True, host=True)))
            }
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))

    isAdmin = auth.is_admin()
    if request.vars['type']:
        type = request.vars['type']
    else :
        type = 'generic'

    step = None
    page = None
    is_not_filtered = "sort" not in request.vars and "filter" not in request.vars
    if request.vars['page'] is not None and is_not_filtered:
        page = int(request.vars['page'])
        step = 50

    list = SampleSetList(type, page, step)
    list.load_creator_names()
    list.load_sample_information()
    list.load_config_information()
    if isAdmin:
        list.load_permitted_groups()
    list.load_anon_permissions()
    result = list.get_values()

    # failsafe if filtered display all results
    step = len(list) if step is None else step
    page = 0 if page is None else page

    factory = ModelFactory()
    helper = factory.get_instance(type=type)
    fields = helper.get_fields()

    ##sort result
    reverse = False
    if request.vars["reverse"] == "true" :
        reverse = True
    if "sort" in request.vars:
        result = sorted(result, key = lambda row : row[request.vars["sort"]], reverse=reverse)
    else:
        result = sorted(result, key = lambda row : row.id, reverse=not reverse)

    ##filter
    if "filter" not in request.vars :
        request.vars["filter"] = ""

    result = helper.filter(request.vars['filter'], result)
    log.debug("%s list (%.3fs) %s" % (request.vars["type"], time.time()-start, request.vars["filter"]))


    return dict(query = result,
                fields = fields,
                helper = helper,
                isAdmin = isAdmin,
                reverse = False,
                step = step,
                page = page)


## return form to create new generic sample_set
def add():
    if (auth.can_create_patient()):
        creation_group_tuple =  get_default_creation_group(auth)
        groups = creation_group_tuple[0]
        max_group = creation_group_tuple[1]
        return dict(message=T('add sample_set'), groups=groups, master_group=max_group)
    else :
        res = {"message": ACCESS_DENIED}
        log.error(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))



## create a generic sample_set if the html form is complete
## needs ["name", "info"]
## redirect to generic sample_set list if success
## return a flash error message if fail
def add_form():
    if (auth.can_create_patient()):

        error = ""
        if request.vars["name"] == "" :
            error += "name needed, "

        if error=="" :
            id_sample_set = db.sample_set.insert(sample_type='generic')

            id = db.generic.insert(name=request.vars["name"],
                                   info=request.vars["info"],
                                   creator=auth.user_id,
                                   sample_set_id=id_sample_set)


            user_group = int(request.vars["sample_set_group"])
            admin_group = db(db.auth_group.role=='admin').select().first().id

            #sample_set creator automaticaly has all rights
            auth.add_permission(user_group, PermissionEnum.access.value, db.generic, id)

            res = {"redirect": "sample_set/index",
                   "args" : { "id" : id_sample_set },
                   "message": "(%s) sample_set %s added" % (id, request.vars["name"]) }
            log.info(res, extra={'user_id': auth.user.id, 'record_id': id, 'table_name': 'sample_set'})

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

def edit():
    sample_set = db.sample_set[request.vars["id"]]
    if sample_set is not None:

        sample_type = sample_set.sample_type
        
        if sample_type == "patient" : 
            patient = db((db.patient.sample_set_id == request.vars["id"])).select()[0]
            redirect(URL('patient', 'edit', vars=dict(id=patient.id)), headers=response.headers)
        
        elif sample_type == "run" :
            run = db((db.run.sample_set_id == request.vars["id"])).select()[0]
            redirect(URL('run', 'edit', vars=dict(id=run.id)), headers=response.headers)

        else :
            generic = db((db.generic.sample_set_id == request.vars["id"])).select()[0]
            if (auth.can_modify('generic', generic.id)):
                request.vars["id"] = generic.id
                return dict(message=T('edit sample_set'))
    res = {"message": ACCESS_DENIED}
    log.error(res)
    return gluon.contrib.simplejson.dumps(res, separators=(',',':'))

def edit_form():
    if (auth.can_modify('generic', request.vars["id"]) ):
        error = ""
        if request.vars["name"] == "" :
            error += "name needed, "
        if request.vars["id"] == "" :
            error += "sample set id needed, "

        if error=="" :
            db.generic[request.vars["id"]] = dict(name=request.vars["name"],
                                                   info=request.vars["info"],
                                                   )

            res = {"redirect": "back",
                   "message": "%s (%s): sample_set edited" % (request.vars["name"], request.vars["sample_set_id"])}
            log.info(res, extra={'user_id': auth.user.id, 'record_id': request.vars['id'], 'table_name': 'generic'})
            return gluon.contrib.simplejson.dumps(res, separators=(',',':'))

        else :
            res = {"success" : "false", "message" : error}
            log.error(res)
            return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
    else :
        res = {"message": ACCESS_DENIED}
        log.error(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))

def custom():
    start = time.time()

    if request.vars["config_id"] and request.vars["config_id"] != "-1" :
        config_id = long(request.vars["config_id"])
        config_name = db.config[request.vars["config_id"]].name
        config = True
        
    else:
        request.vars["config_id"] = -1
        config_id = -1
        config_name = None
        config = False
        
    if "custom_list" not in request.vars :
        request.vars["custom_list"] = []
    if type(request.vars["custom_list"]) is str :
        request.vars["custom_list"] = [request.vars["custom_list"]]
        
    myGroupBy = None
    if request.vars["id"] and auth.can_view_sample_set(request.vars["id"]):
        q = ((auth.vidjil_accessible_query(PermissionEnum.read_config.value, db.config))
                & (db.sample_set.id == request.vars["id"])
                & (db.sample_set_membership.sample_set_id == db.sample_set.id)
                & (db.sequence_file.id == db.sample_set_membership.sequence_file_id)
                & (db.results_file.sequence_file_id==db.sequence_file.id)
                & (db.results_file.data_file != '')
                & (db.config.id==db.results_file.config_id)
            )
        
    else:
        q = ((auth.vidjil_accessible_query(PermissionEnum.read.value, db.patient)
                | auth.vidjil_accessible_query(PermissionEnum.read.value, db.run))
                & (auth.vidjil_accessible_query(PermissionEnum.read_config.value, db.config))
                & (db.sample_set_membership.sample_set_id == db.sample_set.id)
                & (db.sequence_file.id == db.sample_set_membership.sequence_file_id)
                & (db.results_file.sequence_file_id==db.sequence_file.id)
                & (db.results_file.data_file != '')
                & (db.config.id==db.results_file.config_id)
            )
        myGroupBy = db.sequence_file.id|db.patient.id|db.run.id|db.results_file.config_id

    query = db(q).select(
                db.patient.id, db.patient.info, db.patient.first_name, db.patient.last_name,
                db.run.id, db.run.info, db.run.name,
                db.results_file.id, db.results_file.config_id, db.sequence_file.sampling_date,
                db.sequence_file.pcr, db.config.name, db.results_file.run_date, db.results_file.data_file, db.sequence_file.filename,
                db.sequence_file.data_file, db.sequence_file.id, db.sequence_file.info,
                db.sequence_file.size_file,
                left = [
                    db.patient.on(db.patient.sample_set_id == db.sample_set.id),
                    db.run.on(db.run.sample_set_id == db.sample_set.id)
                    ],
                orderby = ~db.patient.id|db.sequence_file.id|db.results_file.run_date,
                groupby = myGroupBy
            )

    ##filter
    if "filter" not in request.vars :
        request.vars["filter"] = ""
        
    for row in query :
        row.checked = False
        if (str(row.results_file.id) in request.vars["custom_list"]) :
            row.checked = True

        if row.patient.id is not None:
            row.names = vidjil_utils.anon_names(row.patient.id, row.patient.first_name, row.patient.last_name)
            info = row.patient.info
        else:
            row.names = row.run.name
            info = row.run.info
        row.string = [row.names, row.sequence_file.filename, str(row.sequence_file.sampling_date), str(row.sequence_file.pcr), str(row.config.name), str(row.results_file.run_date), info]
    query = query.find(lambda row : ( vidjil_utils.advanced_filter(row.string,request.vars["filter"]) or row.checked) )

    
    if config :
        query = query.find(lambda row : ( row.results_file.config_id==config_id or (str(row.results_file.id) in request.vars["custom_list"])) )
    
    log.debug("sample_set/custom (%.3fs) %s" % (time.time()-start, request.vars["filter"]))

    return dict(query=query,
                config_id=config_id,
                config=config)

def confirm():
    if auth.can_modify_sample_set(request.vars["id"]):
        data = get_sample_set(request.vars["id"])
        log.debug('request sample_set deletion')
        return dict(message=T('confirm sample_set deletion'),
                    data=data)
    else :
        res = {"message": ACCESS_DENIED}
        log.error(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))

def delete():
    if (auth.can_modify_sample_set(request.vars["id"]) ):
        sample_set = get_sample_set(request.vars["id"])
        if sample_set is None:
            res = {"message": 'An error occured. This sample_set may have already been deleted'}
            log.error(res)
            return gluon.contrib.simplejson.dumps(res, separators=(',',':'))

        #delete data file
        query = db( (db.sample_set_membership.sample_set_id == sample_set.id)
                    & (db.sequence_file.id == db.sample_set_membership.sequence_file_id)
                ).select(db.sequence_file.id)
        for row in query :
            db(db.results_file.sequence_file_id == row.id).delete()

        #delete sequence file
        query = db((db.sequence_file.id == db.sample_set_membership.sequence_file_id)
            & (db.sample_set_membership.sample_set_id == sample_set.id)
            ).select(db.sequence_file.id)
        for row in query :
            db(db.sequence_file.id == row.id).delete()

        #delete patient sample_set
        db(db.sample_set.id == sample_set.id).delete()

        res = {"redirect": "sample_set/all",
               "success": "true",
               "message": "sample set ("+str(request.vars["id"])+") deleted"}
        log.info(res, extra={'user_id': auth.user.id, 'record_id': request.vars["id"], 'table_name': 'sample_set'})
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
    else :
        res = {"message": ACCESS_DENIED}
        log.error(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
