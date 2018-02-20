# coding: utf8
import gluon.contrib.simplejson, datetime
import vidjil_utils
import time
import json

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

    tag_decorator = TagDecorator(get_tag_prefix())
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
                config=config,
                tag_decorator=tag_decorator)

## return a list of generic sample_sets
def all():
    start = time.time()
    if not auth.user :
        res = {"redirect" : URL('default', 'user', args='login', scheme=True, host=True,
                    vars=dict(_next=URL('sample_set', 'all', vars={'type': defs.SET_TYPE_PATIENT}, scheme=True, host=True)))
            }
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))

    isAdmin = auth.is_admin()
    if request.vars['type']:
        type = request.vars['type']
    else :
        type = defs.SET_TYPE_GENERIC

    step = None
    page = None
    is_not_filtered = "sort" not in request.vars and "filter" not in request.vars
    if request.vars['page'] is not None and is_not_filtered:
        page = int(request.vars['page'])
        step = 50

    ##filter
    if "filter" not in request.vars :
        request.vars["filter"] = ""

    search, tags = parse_search(request.vars["filter"])
    group_ids = get_involved_groups()

    list = SampleSetList(type, page, step, tags=tags)
    list.load_creator_names()
    list.load_sample_information()
    list.load_config_information()
    if isAdmin or len(get_group_list()) > 1:
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

    result = helper.filter(search, result)
    log.debug("%s list (%.3fs) %s" % (request.vars["type"], time.time()-start, search))


    return dict(query = result,
                fields = fields,
                helper = helper,
                group_ids = group_ids,
                isAdmin = isAdmin,
                reverse = False,
                step = step,
                page = page)


## Stats

def stats():
    start = time.time()

    # d = all()
    d = custom()
    
    # Build .vidjil file list
    f_samples = []
    for row in d['query']:
        found = {}
        f_results = defs.DIR_RESULTS + row.results_file.data_file

        f_fused = None
        pos_in_fused = None

        fused_file = ''
        # TODO: fix the following request
        # fused_file = db((db.fused_file.sample_set_id == row.sample_set.id) & (db.fused_file.config_id == row.results_file.config_id)).select(orderby = ~db.fused_file.id, limitby=(0,1))
        if len(fused_file) > 0 and fused_file[0].sequence_file_list is not None:
            sequence_file_list = fused_file[0].sequence_file_list.split('_')
            try:
                pos_in_fused = sequence_file_list.index(str(row.sequence_file.id))
                f_fused = defs.DIR_RESULTS + fused_file[0].fused_file
            except ValueError:
                pass
                
        metadata = { } # 'patient': row.patient, 'sequence_file': row.sequence_file }
        f_samples += [(metadata, f_results, f_fused, pos_in_fused)]
    
    # Send to vidjil_utils.stats
    res = vidjil_utils.stats(f_samples)
    d = {}
    d['stats'] = res
    d['f_samples'] = f_samples # TMP, for debug

    # Return
    log.debug("stats (%.3fs) %s" % (time.time()-start, request.vars["filter"]))
    return gluon.contrib.simplejson.dumps(d, separators=(',',':'))

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
            id_sample_set = db.sample_set.insert(sample_type=defs.SET_TYPE_GENERIC)

            id = db.generic.insert(name=request.vars["name"],
                                   info=request.vars["info"],
                                   creator=auth.user_id,
                                   sample_set_id=id_sample_set)

            user_group = int(request.vars["sample_set_group"])
            admin_group = db(db.auth_group.role=='admin').select().first().id

            register_tags(db, defs.SET_TYPE_GENERIC, id, request.vars["info"], user_group)

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
        
        if sample_type == defs.SET_TYPE_PATIENT:
            patient = db((db.patient.sample_set_id == request.vars["id"])).select()[0]
            redirect(URL('patient', 'edit', vars=dict(id=patient.id)), headers=response.headers)
        
        elif sample_type == defs.SET_TYPE_RUN:
            run = db((db.run.sample_set_id == request.vars["id"])).select()[0]
            redirect(URL('run', 'edit', vars=dict(id=run.id)), headers=response.headers)

        else :
            generic = db((db.generic.sample_set_id == request.vars["id"])).select()[0]
            if (auth.can_modify('generic', generic.id)):
                request.vars["id"] = generic.id
                group_id = get_set_group(defs.SET_TYPE_GENERIC, request.vars["id"])
                return dict(message=T('edit sample_set'), group_id=group_id)
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
            generic = db.generic[request.vars["id"]]
            db.generic[request.vars["id"]] = dict(name=request.vars["name"],
                                                   info=request.vars["info"],
                                                   )

            group_id = get_set_group(defs.SET_TYPE_GENERIC, request.vars["id"])
            if (generic.info != request.vars["info"]):
                register_tags(db, defs.SET_TYPE_GENERIC, request.vars["id"], request.vars["info"], group_id, reset=True)

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
    helper = None
    if request.vars["id"] and auth.can_view_sample_set(request.vars["id"]):
        sample_set = db.sample_set[request.vars["id"]]
        factory = ModelFactory()
        helper = factory.get_instance(type=sample_set.sample_type)
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
                | auth.vidjil_accessible_query(PermissionEnum.read.value, db.run)
                | auth.vidjil_accessible_query(PermissionEnum.read.value, db.generic))
                & (auth.vidjil_accessible_query(PermissionEnum.read_config.value, db.config))
                & (db.sample_set_membership.sample_set_id == db.sample_set.id)
                & (db.sequence_file.id == db.sample_set_membership.sequence_file_id)
                & (db.results_file.sequence_file_id==db.sequence_file.id)
                & (db.results_file.data_file != '')
                & (db.config.id==db.results_file.config_id)
            )
        myGroupBy = db.sequence_file.id|db.patient.id|db.run.id|db.generic.id|db.results_file.config_id

    group_ids = get_involved_groups()

    ##filter
    if "filter" not in request.vars :
        request.vars["filter"] = ""

    search, tags = parse_search(request.vars["filter"])

    if (tags is not None and len(tags) > 0):
        q = filter_by_tags(q, 'sequence_file', tags)
        count = db.tag.name.count()
        query = db(q).select(
                db.patient.id, db.patient.info, db.patient.first_name, db.patient.last_name,
                db.run.id, db.run.info, db.run.name,
                db.generic.id, db.generic.info, db.generic.name,
                db.results_file.id, db.results_file.config_id, db.sequence_file.sampling_date,
                db.sequence_file.pcr, db.config.name, db.results_file.run_date, db.results_file.data_file, db.sequence_file.filename,
                db.sequence_file.data_file, db.sequence_file.id, db.sequence_file.info,
                db.sequence_file.size_file,
                db.tag_ref.record_id,
                db.tag_ref.table_name,
                count,
                left = [
                    db.patient.on(db.patient.sample_set_id == db.sample_set.id),
                    db.run.on(db.run.sample_set_id == db.sample_set.id),
                    db.generic.on(db.generic.sample_set_id == db.sample_set.id)
                    ],
                orderby = db.sequence_file.id|db.results_file.run_date,
                groupby = db.tag_ref.table_name|db.tag_ref.record_id,
                having = count >= len(tags)
            )

    else:
        query = db(q).select(
                db.patient.id, db.patient.info, db.patient.first_name, db.patient.last_name,
                db.run.id, db.run.info, db.run.name,
                db.generic.id, db.generic.info, db.generic.name,
                db.results_file.id, db.results_file.config_id, db.sequence_file.sampling_date,
                db.sequence_file.pcr, db.config.name, db.results_file.run_date, db.results_file.data_file, db.sequence_file.filename,
                db.sequence_file.data_file, db.sequence_file.id, db.sequence_file.info,
                db.sequence_file.size_file,
                left = [
                    db.patient.on(db.patient.sample_set_id == db.sample_set.id),
                    db.run.on(db.run.sample_set_id == db.sample_set.id),
                    db.generic.on(db.generic.sample_set_id == db.sample_set.id)
                    ],
                orderby = db.sequence_file.id|db.results_file.run_date,
                groupby = myGroupBy
            )

    for row in query :
        row.checked = False
        if (str(row.results_file.id) in request.vars["custom_list"]) :
            row.checked = True

        if row.patient.id is not None:
            row.names = vidjil_utils.anon_names(row.patient.id, row.patient.first_name, row.patient.last_name)
            info = row.patient.info
        elif row.run.id is not None:
            row.names = row.run.name
            info = row.run.info
        elif row.generic.id is not None:
            row.names = row.generic.name
            info = row.generic.info
        row.string = [row.names, row.sequence_file.filename, str(row.sequence_file.sampling_date), str(row.sequence_file.pcr), str(row.config.name), str(row.results_file.run_date), info]
    query = query.find(lambda row : ( vidjil_utils.advanced_filter(row.string,search) or row.checked) )

    
    if config :
        query = query.find(lambda row : ( row.results_file.config_id==config_id or (str(row.results_file.id) in request.vars["custom_list"])) )
    
    tag_decorator = TagDecorator(get_tag_prefix())
    log.debug("sample_set/custom (%.3fs) %s" % (time.time()-start, search))

    return dict(query=query,
                config_id=config_id,
                config=config,
                helper=helper,
                tag_decorator=tag_decorator,
                group_ids=group_ids)

def confirm():
    if auth.can_modify_sample_set(request.vars["id"]):
        sample_set = db.sample_set[request.vars["id"]]
        data = db(db[sample_set.sample_type].sample_set_id == sample_set.id).select().first()
        factory = ModelFactory()
        helper = factory.get_instance(type=sample_set.sample_type)
        log.debug('request sample_set deletion')
        return dict(message=T('confirm sample_set deletion'),
                    data=data,
                    helper=helper)
    else :
        res = {"message": ACCESS_DENIED}
        log.error(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))

def delete():
    if (auth.can_modify_sample_set(request.vars["id"]) ):
        sample_set = db.sample_set[request.vars["id"]]
        sample_type = sample_set.sample_type
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
               "args": {"type": sample_type},
               "success": "true",
               "message": "sample set ("+str(request.vars["id"])+") deleted"}
        log.info(res, extra={'user_id': auth.user.id, 'record_id': request.vars["id"], 'table_name': 'sample_set'})
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
    else :
        res = {"message": ACCESS_DENIED}
        log.error(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))

#
def permission():
    if (auth.can_modify_sample_set(request.vars["id"]) ):
        sample_set = db.sample_set[request.vars["id"]]
        stype = sample_set.sample_type
        factory = ModelFactory()
        helper = factory.get_instance(type=stype)

        data = db(db[stype].sample_set_id == sample_set.id).select().first()

        query = db( db.auth_group.role != 'admin' ).select()

        for row in query :
            row.owner = row.role
            if row.owner[:5] == "user_" :
                id = int(row.owner[5:])
                row.owner = db.auth_user[id].first_name + " " + db.auth_user[id].last_name

            permissions = db(
                    (db.auth_permission.group_id == row.id) &
                    (db.auth_permission.record_id == 0) &
                    (db.auth_permission.table_name == db.sample_set)).select()
            row.perms = ', '.join(map(lambda x: x.name, permissions))

            row.parent_access = ', '.join(str(value) for value in auth.get_access_groups(db[stype], request.vars['id'], group=row.id))
            row.read =  auth.get_group_access(sample_set.sample_type, data.id, row.id)

        return dict(query=query,
                    helper=helper,
                    data=data)
    else :
        res = {"message": ACCESS_DENIED}
        log.error(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))

#
def change_permission():
    if (auth.can_modify_sample_set(request.vars["sample_set_id"]) ):
        ssid = request.vars["sample_set_id"]
        sample_set = db.sample_set[ssid]
        sample_type = sample_set.sample_type
        data_id = db(db[sample_type].sample_set_id == ssid).select().first().id

        error = ""
        if request.vars["group_id"] == "" :
            error += "missing group_id, "
        if ssid == "" :
            error += "missing sample_set_id, "

        if error=="":
            if auth.get_group_access(sample_type,
                      data_id,
                      int(request.vars["group_id"])):
                auth.del_permission(request.vars["group_id"], PermissionEnum.access.value, db[sample_type], data_id)
                res = {"message" : "access '%s' deleted to '%s'" % (PermissionEnum.access.value, db.auth_group[request.vars["group_id"]].role)}
            else :

                auth.add_permission(request.vars["group_id"], PermissionEnum.access.value, db[sample_type], data_id)
                res = {"message" : "access '%s' granted to '%s'" % (PermissionEnum.access.value, db.auth_group[request.vars["group_id"]].role)}

            log.info(res)
            return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
        else :
            res = {"message": "incomplete request : "+error }
            log.error(res)
            return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
    else :
        res = {"message": ACCESS_DENIED}
        log.error(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))

def get_sample_set_list(type):
    query = db(
        auth.vidjil_accessible_query(PermissionEnum.admin.value, db[type])
    ).select(
        db[type].ALL, # sub optimal, use helpers to reduce ?
        orderby = ~db[type].id
    )
    ss_list = []

    factory = ModelFactory()
    helper = factory.get_instance(type=type)
    for row in query :
        tmp = helper.get_id_string(row)
        ss_list.append({'name':tmp})
    return ss_list

def auto_complete():
    if "keys" not in request.vars:
        return error_message("missing group ids")

    sample_types = json.loads(request.vars['keys'])
    result = {}
    for sample_type in sample_types:
        result[sample_type] = get_sample_set_list(sample_type)

    return json.dumps(result)
