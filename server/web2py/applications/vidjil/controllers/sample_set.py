# coding: utf8
import gluon.contrib.simplejson, datetime
import vidjil_utils
import time
import json
from vidjilparser import VidjilParser
from collections  import defaultdict
import operator
import math

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
            sample_set_id = int(request.vars['id'])
            
            go_next = int(request.vars['next'])
            same_type_with_permissions = (db.sample_set.sample_type == sample_type) & (auth.vidjil_accessible_query(PermissionEnum.read.value, db.sample_set))
            if go_next > 0:
                res = db((db.sample_set.id > sample_set_id) & (same_type_with_permissions)).select(
                    db.sample_set.id, orderby=db.sample_set.id, limitby=(0,1))
            else:
                res = db((db.sample_set.id < sample_set_id) & (same_type_with_permissions)).select(
                    db.sample_set.id, orderby=~db.sample_set.id, limitby=(0,1))
            if (len(res) > 0):
                request.vars["id"] = str(res[0].id)
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
        config = True
    elif request.vars["config_id"] and request.vars["config_id"] == "-1":
        most_used_query = db(
                (db.fused_file.sample_set_id == sample_set.id)
            ).select(
                db.fused_file.config_id.with_alias('id'),
                db.fused_file.id.count().with_alias('use_count'),
                groupby=db.fused_file.config_id,
                orderby=db.fused_file.id.count(),
                limitby=(0,1)
            )
        if len(most_used_query) > 0:
            config_id = most_used_query[0].id
            config = True
        else:
            config_id = -1
            config = False
    else:
        config_id = -1
        config = False

    if config :
        config_name = db.config[config_id].name

        fused = db(
            (db.fused_file.sample_set_id == sample_set_id)
            & (db.fused_file.config_id == config_id)
        )

        analysis = db(
            db.analysis_file.sample_set_id == sample_set_id
        ).select(orderby=~db.analysis_file.analyze_date)
        
        
        fused_count = fused.count()
        fused_file = fused.select()
        fused_filename = info_file["filename"] +"_"+ config_name + ".vidjil"
        analysis_count = len(analysis)
        analysis_file = analysis
        analysis_filename = info_file["filename"]+"_"+ config_name + ".analysis"
        
	query =[]
	
        query2 = db(
                (db.sequence_file.id == db.sample_set_membership.sequence_file_id)
                & (db.sample_set_membership.sample_set_id == sample_set_id)
            ).select(
                left=db.results_file.on(
                    (db.results_file.sequence_file_id==db.sequence_file.id)
                    & (db.results_file.config_id==str(config_id))
                    & (db.results_file.hidden == False)
                ), 
                orderby = db.sequence_file.id|~db.results_file.run_date
            )
        
	previous=-1
	for row in query2 :
	    if row.sequence_file.id != previous : 
		query.append(row)
		previous=row.sequence_file.id

    else:
        fused_count = 0
        fused_file = ""
        fused_filename = ""
        analysis_count = 0
        analysis_file = ""
        analysis_filename = ""

        query = db(
                (db.sequence_file.id == db.sample_set_membership.sequence_file_id)
                & (db.sample_set_membership.sample_set_id == sample_set_id)
            ).select(
                left=db.results_file.on(
                    (db.results_file.sequence_file_id==db.sequence_file.id)
                    & (db.results_file.config_id==str(config_id))
                    & (db.results_file.hidden == False)
                )
            )

    all_sequence_files = [r.sample_set_membership.sequence_file_id for r in query]

    (shared_sets, sample_sets) = get_associated_sample_sets(all_sequence_files, [sample_set_id])
    
    samplesets = SampleSets(sample_sets.keys())
    sets_names = samplesets.get_names()

    ## assign set to each rows
    for row in query:
        row.list_share_set = []
        if row.sequence_file.id in shared_sets:
            for elt in shared_sets[row.sequence_file.id]:
                values = {"title": sets_names[elt],
                          "sample_type": sample_sets[elt].sample_type, "id":elt}
                row.list_share_set.append(values)

    tag_decorator = TagDecorator(get_tag_prefix())
    query_pre_process = db( db.pre_process.id >0 ).select()
    pre_process_list = {}
    for row in query_pre_process:
        pre_process_list[row.id] = row.name

    classification   = getConfigsByClassification()

    http_origin = ""
    if request.env['HTTP_ORIGIN'] is not None:
        http_origin = request.env['HTTP_ORIGIN'] + "/"

    log.info('sample_set (%s)' % request.vars["id"], extra={'user_id': auth.user.id,
        'record_id': request.vars["id"],
        'table_name': "sample_set"})
    #if (auth.can_view_patient(request.vars["id"]) ):
    return dict(query=query,
                has_shared_sets = len(shared_sets) > 0,
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
                classification=classification,
                tag_decorator=tag_decorator,
                http_origin=http_origin)

## return a list of generic sample_sets
def all():
    start = time.time()
    if request.vars['type']:
        type = request.vars['type']
    else :
        type = defs.SET_TYPE_GENERIC

    if not auth.user :
        res = {"redirect" : URL('default', 'user', args='login', scheme=True, host=True,
                    vars=dict(_next=URL('sample_set', 'all', vars={'type': type, 'page': 0}, scheme=True, host=True)))
            }
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))

    isAdmin = auth.is_admin()

    step = None
    page = None
    if request.vars['page'] is not None:
        page = int(request.vars['page'])
        step = 50

    ##filter
    if "filter" not in request.vars :
        request.vars["filter"] = ""

    search, tags = parse_search(request.vars["filter"])
    group_ids = get_involved_groups()

    factory = ModelFactory()
    helper = factory.get_instance(type=type)

    f = time.time()
    slist = SampleSetList(helper, page, step, tags, search)

    log.debug("list loaded (%.3fs)" % (time.time() - f))

    mid = time.time()

    set_ids = set([s.sample_set_id for s in slist.result])
    admin_permissions = [s.id for s in db(auth.vidjil_accessible_query(PermissionEnum.admin.value, db.sample_set)).select(db.sample_set.id)]
    admin_permissions = list(set(admin_permissions) & set_ids)

    log.debug("permission load (%.3fs)" % (time.time() - mid))

    # failsafe if filtered display all results
    step = len(slist) if step is None else step
    page = 0 if page is None else page
    result = slist.result

    fields = helper.get_fields()
    sort_fields = helper.get_sort_fields()

    ##sort result
    reverse = False
    if request.vars["reverse"] == "true" :
        reverse = True
    if "sort" in request.vars:
        result = sorted(result, key = sort_fields[request.vars["sort"]]['call'], reverse=reverse)
    else:
        result = sorted(result, key = lambda row : row.id, reverse=not reverse)

    log.info("%s list %s" % (request.vars["type"], search), extra={'user_id': auth.user.id,
        'record_id': None,
        'table_name': "sample_set"})
    log.debug("sample_set list (%.3fs)" % (time.time()-start))


    return dict(query = result,
                fields = fields,
                helper = helper,
                group_ids = group_ids,
                admin_permissions = admin_permissions,
                isAdmin = isAdmin,
                reverse = reverse,
                step = step,
                page = page)

def stats():
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

    ##filter
    if "filter" not in request.vars :
        request.vars["filter"] = ""

    search, tags = parse_search(request.vars["filter"])
    group_ids = get_involved_groups()

    factory = ModelFactory()
    helper = factory.get_instance(type=type)

    slist = SampleSetList(helper, tags=tags)
    result = slist.result

    fields = helper.get_reduced_fields()

    ##sort result
    reverse = False
    if request.vars["reverse"] == "true" :
        reverse = True
    if "sort" in request.vars:
        result = sorted(result, key = lambda row : row[request.vars["sort"]], reverse=reverse)
    else:
        result = sorted(result, key = lambda row : row.id, reverse=not reverse)

    classification   = getConfigsByClassification()

    result = helper.filter(search, result)
    log.info("%s stat list %s" % (request.vars["type"], search), extra={'user_id': auth.user.id,
        'record_id': None,
        'table_name': "sample_set"})
    log.debug("stat list (%.3f s)" % (time.time()-start))

    return dict(query = result,
                fields = fields,
                helper = helper,
                group_ids = group_ids,
                isAdmin = isAdmin,
                classification=classification,
                reverse = False)

def result_files():
    from zipfile import ZipFile
    from cStringIO import StringIO
    import types
    errors = []
    config_id = request.vars['config_id']
    sample_set_ids = []
    if 'sample_set_ids' in request.vars:
        sample_set_ids = request.vars['sample_set_ids']

    #little hack since we can't pass array parameters with only one value
    if isinstance(sample_set_ids, types.StringTypes):
        sample_set_ids = [sample_set_ids]

    permissions = [auth.can_view_sample_set(int(id)) for id in sample_set_ids]
    if sum(permissions) < len(permissions):
        res = {"message": "You don't have permissions to access those sample sets"}
        log.error("An error occured when creating archive of sample_sets %s" % str(sample_set_ids))
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))


    if int(config_id) == -1:
        config_query = (db.results_file.config_id > 0)
    else:
        config_query = (db.results_file.config_id == config_id)


    left_join = [
        db.patient.on(db.patient.sample_set_id == db.sample_set.id),
        db.run.on(db.run.sample_set_id == db.sample_set.id),
        db.generic.on(db.generic.sample_set_id == db.sample_set.id)
    ]
    q = db(
            (db.sample_set.id.belongs(sample_set_ids)) &
            (db.sample_set_membership.sample_set_id == db.sample_set.id) &
            (db.sequence_file.id == db.sample_set_membership.sequence_file_id) &
            (db.results_file.sequence_file_id == db.sequence_file.id) &
            (db.results_file.data_file != None) &
            (db.results_file.hidden == False) &
            config_query
        )

    results = q.select(db.results_file.ALL, db.sequence_file.ALL, db.sample_set.ALL, db.patient.ALL, db.run.ALL, db.generic.ALL, left=left_join)

    sample_types = ['patient', 'run', 'generic']
    mf = ModelFactory()
    helpers = {}

    for t in sample_types:
        helpers[t] = mf.get_instance(type=t)

    filename = "export_%s_%s.zip" % ('-'.join(sample_set_ids), str(datetime.date.today()))
    filedir = defs.DIR_SEQUENCES + '/' + filename
    try:
        zipfile = ZipFile(filedir, 'w')
        metadata = []
        for res in results:
            metadata.append({'id': res.sample_set.id,
                'name': helpers[res.sample_set.sample_type].get_name(res[res.sample_set.sample_type]),
                'file': res.results_file.data_file,
                'set_info': res[res.sample_set.sample_type].info,
                'sample_info': res.sequence_file.info,
                'sequence_file': res.sequence_file.filename})
            path = defs.DIR_RESULTS + res.results_file.data_file
            zipfile.writestr(res.results_file.data_file, open(path, 'rb').read())

        zipfile.writestr('metadata.json', json.dumps(metadata))

        zipfile.close()

        response.headers['Content-Type'] = "application/zip"
        response.headers['Content-Disposition'] = 'attachment; filename=%s' % filename# to force download as attachment
        log.info("extract results files (%s)" % sample_set_ids, extra={'user_id': auth.user.id,
            'record_id': None,
            'table_name': "sample_set"})

        return response.stream(open(filedir), chunk_size=4096)
    except:
        res = {"message": "an error occurred"}
        log.error("An error occured when creating archive of sample_sets %s" % str(sample_set_ids))
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
    finally:
        try:
            os.unlink(filedir)
        except OSError:
            pass


## Stats

def mystats():
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

    #TODO can we get a record id here ?
    log.info('stats (%s)' % request.vars["id"], extra={'user_id': auth.user.id,
        'record_id': None,
        'table_name': "results_file"})
    log.debug("mystats (%.3fs) %s" % (time.time()-start, request.vars["filter"]))
    # Return
    return gluon.contrib.simplejson.dumps(d, separators=(',',':'))

## return form to create new set
def form():
    denied = False
    # edit set
    extra = {'user_id': auth.user.id, 'record_id': None, 'table_name': "sample_set"}
    if("id" in request.vars):
        sample_set = db.sample_set[request.vars["id"]]
        set_type = sample_set.sample_type
        sset = db(db[set_type].sample_set_id == sample_set.id).select().first()
        if(auth.can_modify_sample_set(sset.sample_set_id)):
            groups = [get_set_group(sset.sample_set_id)]
            action = 'edit'
            max_group = None
        else:
            denied = True
        extra['record_id'] = request.vars["id"]

    # new set
    elif (auth.can_create_patient()):
        sset = None
        set_type = request.vars["type"]
        creation_group_tuple = get_default_creation_group(auth)
        groups = creation_group_tuple[0]
        max_group = creation_group_tuple[1]
        action = 'add'
    else :
        denied = True

    if denied:
        res = {"message": ACCESS_DENIED}
        log.error(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))

    message = '%s %s' % (action, set_type)
    sets = {
            'patient': [],
            'run': [],
            'generic': []
            }
    # We add a None object to the desired set type to initialise an empty form in the template.
    sets[set_type].append(sset)
    log.info("load form " + message, extra=extra)
    return dict(message=T(message),
                groups=groups,
                group_ids = get_involved_groups(),
                master_group=max_group,
                sets=sets,
                isEditing = (action=='edit'))



## create a patient if the html form is complete
## need ["first_name", "last_name", "birth_date", "info"]
## redirect to patient list if success
## return a flash error message if fail
def submit():
    data = json.loads(request.vars['data'], encoding='utf-8')
    mf = ModelFactory()

    error = False
    set_types = vidjil_utils.get_found_types(data)

    length_mapping = {}
    sum_sets = 0
    for set_type in set_types:
        helper = mf.get_instance(set_type)
        length = len(data[set_type])
        sum_sets += length
        if length not in length_mapping:
            length_mapping[length] = set_type
        for p in data[set_type]:
            if p is None:
                continue
            errors = helper.validate(p)
            action = "add"
            if len(errors) > 0:
                p['error'] = errors
                error = True
                continue

            register = False
            reset = False

            name = helper.get_name(p)

            # edit
            if (p['sample_set_id'] != "" and auth.can_modify_sample_set(p['sample_set_id'])):
                reset = True
                sset = db(db[set_type].sample_set_id == p['sample_set_id']).select().first()
                db[set_type][sset.id] = p
                id_sample_set = sset['sample_set_id']

                if (sset.info != p['info']):
                    group_id = get_set_group(id_sample_set)
                    register = True
                    reset = True

                action = "edit"

            # add
            elif (auth.can_create_patient()):

                id_sample_set = db.sample_set.insert(sample_type=set_type)

                p['creator'] = auth.user_id
                p['sample_set_id'] = id_sample_set
                p['id'] = db[set_type].insert(**p)

                group_id = int(data["group"])

                register = True

                #patient creator automaticaly has all rights
                auth.add_permission(group_id, PermissionEnum.access.value, 'sample_set', p['sample_set_id'])

                action = "add"

                if (p['id'] % 100) == 0:
                    mail.send(to=defs.ADMIN_EMAILS,
                    subject=defs.EMAIL_SUBJECT_START+" %d" % p['id'],
                    message="The %dth %s has just been created." % (p['id'], set_type))

            else :
                p['error'].append("permission denied")
                error = True

            p['message'] = []
            mes = u"%s (%s) %s %sed" % (set_type, id_sample_set, name, action)
            p['message'].append(mes)
            log.info(mes, extra={'user_id': auth.user.id, 'record_id': id_sample_set, 'table_name': 'sample_set'})
            if register:
                register_tags(db, set_type, p["id"], p["info"], group_id, reset=reset)

    if not error:
        if not bool(length_mapping):
            creation_group_tuple = get_default_creation_group(auth)
            response.view = 'sample_set/form.html'
            sets = {
                'patient': [],
                'run': [],
                'generic': []
            }
            return dict(message=T("form is empty"),
                    groups=creation_group_tuple[0],
                    group_ids = get_involved_groups(),
                    master_group=creation_group_tuple[1],
                    sets=sets,
                    isEditing = False)

        max_num = max(length_mapping.keys())
        msg = "successfully added/edited set(s)"
        if sum_sets == 1:
            res = {"redirect": "sample_set/index",
                   "args": { "id":  data[length_mapping[max_num]][0]['sample_set_id']},
                   "message": msg}
        else:
            res = {"redirect": "sample_set/all",
                    "args" : { "type" : length_mapping[max_num], "page": 0 },
                    "message": msg}
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
    else:
        sets = {
                'patient': data['patient'] if 'patient' in data else [],
                'run': data['run'] if 'run' in data else [],
                'generic': data['generic'] if 'generic' in data else []
                }
        response.view = 'sample_set/form.html'
        return dict(message=T("an error occured"),
                groups=[{'name': 'foobar', 'id': int(data['group'])}],
                master_group=data['group'],
                sets=sets,
                isEditing = (action=='edit'))

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
        qq = (db.sample_set.id == request.vars["id"])
        
    else:
        qq = (auth.vidjil_accessible_query(PermissionEnum.read.value, db.sample_set))
        myGroupBy = db.sequence_file.id|db.patient.id|db.run.id|db.generic.id|db.results_file.config_id

    q = (qq
        & (auth.vidjil_accessible_query(PermissionEnum.read_config.value, db.config))
        & (db.sample_set_membership.sample_set_id == db.sample_set.id)
        & (db.sequence_file.id == db.sample_set_membership.sequence_file_id)
        & (db.results_file.sequence_file_id==db.sequence_file.id)
        & (db.results_file.data_file != '')
        & (db.results_file.hidden == False)
        & (db.config.id==db.results_file.config_id))

    group_ids = get_involved_groups()

    ##filter
    if "filter" not in request.vars :
        request.vars["filter"] = ""

    search, tags = parse_search(request.vars["filter"])

    left_join = [
        db.patient.on(db.patient.sample_set_id == db.sample_set.id),
        db.run.on(db.run.sample_set_id == db.sample_set.id),
        db.generic.on(db.generic.sample_set_id == db.sample_set.id)
    ]

    select = [
        db.patient.id, db.patient.sample_set_id, db.patient.info, db.patient.first_name, db.patient.last_name,
        db.run.id, db.run.info, db.run.name,
        db.generic.id, db.generic.info, db.generic.name,
        db.results_file.id, db.results_file.config_id, db.sequence_file.sampling_date,
        db.sequence_file.pcr, db.config.name, db.results_file.run_date, db.results_file.data_file, db.sequence_file.filename,
        db.sequence_file.data_file, db.sequence_file.id, db.sequence_file.info,
        db.sequence_file.size_file
    ]

    if (tags is not None and len(tags) > 0):
        q = filter_by_tags(q, 'sequence_file', tags)
        count = db.tag.name.count()
        select = select + [db.tag_ref.record_id,
                db.tag_ref.table_name,
                count]

        query = db(q).select(
                *select,
                left = left_join,
                orderby = db.sequence_file.id|db.results_file.run_date,
                groupby = db.tag_ref.table_name|db.tag_ref.record_id,
                having = count >= len(tags)
            )

    else:
        query = db(q).select(
                *select,
                left = left_join,
                orderby = db.sequence_file.id|db.results_file.run_date,
                groupby = myGroupBy
            )

    for row in query :
        row.checked = False
        if (str(row.results_file.id) in request.vars["custom_list"]) :
            row.checked = True

        if row.patient.id is not None:
            #TODO use helper.
            row.names = vidjil_utils.display_names(row.patient.sample_set_id, row.patient.first_name, row.patient.last_name)
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
    log.info("load compare list", extra={'user_id': auth.user.id, 'record_id': None, 'table_name': "results_file"})
    log.debug("sample_set/custom (%.3fs) %s" % (time.time()-start, search))


    classification   = getConfigsByClassification()

    return dict(query=query,
                config_id=config_id,
                config=config,
                helper=helper,
                tag_decorator=tag_decorator,
                classification=classification,
                group_ids=group_ids)

def getConfigsByClassification():
    """ Return list of available and auth config, classed by classification values """
    i = 0
    classification   = defaultdict( lambda: {"info":"", "name":"", "configs":[]} )
    if auth.can_process_sample_set(request.vars['id']) :
        for class_elt in db( (db.classification)).select(orderby=db.classification.id):
            configs = db( (db.config.classification == class_elt.id) & (auth.vidjil_accessible_query(PermissionEnum.read.value, db.config) | auth.vidjil_accessible_query(PermissionEnum.admin.value, db.config) ) ).select(orderby=db.config.name)
            if len(configs): # don't show empty optgroup
                classification["%02d_%s" % (i, class_elt)]["name"]    = class_elt.name
                classification["%02d_%s" % (i, class_elt)]["info"]    = class_elt.info
                classification["%02d_%s" % (i, class_elt)]["configs"] = configs
            i += 1
        classification["%02d_noclass" % i]["name"]    = "–"
        classification["%02d_noclass" % i]["info"]    = ""
        classification["%02d_noclass" % i]["configs"] = db( (db.config.classification == None) & (auth.vidjil_accessible_query(PermissionEnum.read.value, db.config) | auth.vidjil_accessible_query(PermissionEnum.admin.value, db.config) ) ).select(orderby=db.config.name)
    return classification

def getStatHeaders():
    m = StatDecorator()
    s = SetsDecorator()
    b = BooleanDecorator()
    p = BarDecorator()
    bc = BarChartDecorator()
    lbc = LabeledBarChartDecorator()
    g = GenescanDecorator()
    l = LociListDecorator()
    return [('sets', 'db', s),
            #('reads', 'parser', m),
            ('mapped reads', 'parser', m),
            #('mapped_percent', 'parser', p),
            ('read lengths', 'parser', g),
            #('bool', 'parser', b),
            #('bool_true', 'parser', b),
            ('loci', 'parser', l),
            #('distribution', 'parser', lbc),
            #('clones_five_percent', 'parser', m),
            ('main clone', 'parser', m)
            #('abundance', 'parser', lbc)
        ]

def getFusedStats(fuse):
    log.debug("getFusedStats()")
    file_path = "%s%s" % (defs.DIR_RESULTS, fuse['fused_file_name'])
    results_files = fuse['results_files']
    d = {}
    with open(file_path, 'r') as json_file :
        data = json.load(json_file)
        top_clones = data['clones'][:data['samples']['number']]

        for results_file_id in results_files:
            dest = {}
            res = results_files[results_file_id]
            result_index = -1
            if "results_file_id" in data['samples']:
                result_index = data['samples']['results_file_id'].index(results_file_id)
            elif "original_names" in data['samples']:
                basenames = [os.path.basename(x) for x in data['samples']['original_names']]
                result_basename = os.path.basename(res['sequence_file']) if res['sequence_file'] else None
                if result_basename in basenames:
                    result_index = basenames.index(result_basename)
                else:
                    # No corresponding data (old file ?), we skip this result_file
                    continue

            sorted_clones = sorted(top_clones, key=lambda clone: clone['reads'][result_index], reverse=True)
            if 'name' in sorted_clones[0]:
                dest['main clone'] = sorted_clones[0]['name']
            else:
                dest['main clone'] = sorted_clones[0]['germline']
            reads = data['reads']['total'][result_index]
            # dest['reads'] = reads
            mapped_reads = data['reads']['segmented'][result_index]
            dest['mapped reads'] = "%d / %d (%.2f %%)" % (mapped_reads, reads, 100.0*mapped_reads/reads if reads else 0)
            dest['mapped_percent'] = 100.0 * (float(data['reads']['segmented'][result_index])/float(reads))
            dest['abundance'] = [(key, 100.0*data['reads']['germline'][key][result_index]/reads) for key in data['reads']['germline']]

            tmp = {}
            for c in data['clones']:
                try:
                    arl = int(math.ceil(c['_average_read_length'][result_index]))
                except:
                    continue
                if arl > 0:
                    if arl not in tmp:
                        tmp[arl] = 0.0
                    tmp[arl] += float(c['reads'][result_index])
            min_len = 100 #int(min(tmp.keys()))
            max_len = 600 #int(max(tmp.keys()))
            tmp_list = []

            if mapped_reads == 0:
                mapped_reads = 1
            for i in range(min_len, max_len):
                if i in tmp:
                    if tmp[i]:
                        scaled_val = (2.5 + math.log10(tmp[i]/mapped_reads)) / 2
                        display_val = max(0.01, min(1, scaled_val)) * 100
                    else:
                        display_val = 0
                    real_val = 100.0*(tmp[i]/mapped_reads)
                else:
                    display_val = 0
                    real_val = 0
                tmp_list.append((i, display_val, real_val))
            dest['read lengths'] = tmp_list

            #dest['bool'] = False
            #dest['bool_true'] = True
            dest['loci'] = sorted([x for x in data['reads']['germline'] if data['reads']['germline'][x][result_index] > 0])
            dest['clones_five_percent'] = sum([data['reads']['distribution'][key][result_index] for key in data['reads']['germline']  if key in data['reads']['distribution']])
            d[results_file_id] = dest
    return d

def getResultsStats(file_name, dest):
    import ijson.backends.yajl2_cffi as ijson
    log.debug("getResultsStats()")
    file_path = "%s%s" % (defs.DIR_RESULTS, file_name)
    distributions = []
    with open(file_path, 'rb') as results:
        i = "1"
        while True:
            results.seek(0, 0)
            tmp =  [d for d in ijson.items(results, "reads-distribution-%s.item" % i)]
            if len(tmp) == 0:
                break
            else:
                distributions.append((i, tmp[0]))
                i += "0"
    dest['distribution'] = distributions
    return dest

def getStatData(results_file_ids):
    log.debug("getStatData(%s)" % str(results_file_ids))
    mf = ModelFactory()
    set_types = [defs.SET_TYPE_PATIENT, defs.SET_TYPE_RUN, defs.SET_TYPE_GENERIC]
    helpers = {}
    for stype in set_types:
        helpers[stype] = mf.get_instance(stype)

    query = db(
        (db.results_file.id.belongs(results_file_ids)) &
        (db.sequence_file.id == db.results_file.sequence_file_id) &
        (db.config.id == db.results_file.config_id) &
        (db.sample_set_membership.sequence_file_id == db.sequence_file.id) &
        (db.sample_set.id == db.sample_set_membership.sample_set_id) &
        (db.fused_file.sample_set_id == db.sample_set.id) &
        (db.fused_file.config_id == db.config.id)
        ).select(
            db.results_file.sequence_file_id, db.results_file.config_id,
            db.results_file.data_file.with_alias("data_file"), db.results_file.id.with_alias("results_file_id"),
            db.sequence_file.data_file.with_alias("sequence_file"),
            db.sample_set.id.with_alias("set_id"),
            db.sample_set.sample_type.with_alias("sample_type"),
            db.fused_file.fused_file.with_alias("fused_file"), db.fused_file.fused_file.with_alias("fused_file_id"),
            db.patient.first_name, db.patient.last_name, db.patient.info.with_alias('set_info'), db.patient.sample_set_id,
            db.run.name,
            db.generic.name,
            db.config.name,

            db.generic.name.with_alias("set_name"), # use generic name as failsafe for set name
            left = [
                db.patient.on(db.patient.sample_set_id == db.sample_set.id),
                db.run.on(db.run.sample_set_id == db.sample_set.id),
                db.generic.on(db.generic.sample_set_id == db.sample_set.id)
            ]
        )

    tmp_data = {}
    for res in query:
        set_type = res['sample_type']
        if res.fused_file_id not in tmp_data:
            tmp_fuse = {}
            tmp_fuse['results_files'] = {}
            tmp_fuse['fused_file_name'] = res.fused_file
            tmp_data[res.fused_file_id] = tmp_fuse
        else:
            tmp_fuse = tmp_data[res.fused_file_id]

        if res.results_file_id not in tmp_fuse['results_files']:
            tmp = res.copy()
            tmp['sets'] = []
            tmp_fuse['results_files'][tmp['results_file_id']] = tmp
            tmp.pop('set_id', None)
            tmp.pop(set_type, None)
            tmp.pop('set_info', None)
        else:
            tmp = tmp_fuse['results_files'][res['results_file_id']]

        sample_set = {}
        sample_set['id'] = res['set_id']
        sample_set['name'] = helpers[set_type].get_name(res[set_type])
        sample_set['info'] = res['set_info']
        sample_set['type'] = set_type
        tmp['sets'].append(sample_set)


    data = []
    for fuse_id in tmp_data:
        fuse = tmp_data[fuse_id]
        d = getFusedStats(fuse)
        #d = getResultsStats(res['data_file'], d)
        headers = getStatHeaders()
        for results_file_id in d:
            res = fuse['results_files'][results_file_id]
            r = d[results_file_id]
            for head, htype, model in headers:
                if htype == 'db':
                    r[head] = res[head]
                r[head] = model.decorate(r[head])
            r['sequence_file_id'] = res['results_file']['sequence_file_id']
            r['config_id'] = res['results_file']['config_id']
            data.append(r)
    return data

def multi_sample_stats():
    data = {}
    data['headers'] = [h for h, t, m in getStatHeaders()]
    results = []
    custom_result = request.vars['custom_result']
    if not isinstance(custom_result, list):
        custom_result = [custom_result]

    custom_result = [long(i) for i in custom_result]

    permitted_results = db(
        (auth.vidjil_accessible_query(PermissionEnum.read.value, db.sample_set)) &
        (db.sample_set.id == db.sample_set_membership.sample_set_id) &
        (db.sample_set_membership.sequence_file_id == db.results_file.sequence_file_id) &
        (db.results_file.id.belongs(custom_result))
    ).select(
            db.results_file.id.with_alias('results_file_id')
        )

    permitted_results_ids = [r.results_file_id for r in permitted_results]
    if set(permitted_results_ids) != set(custom_result):
        res = {"message": ACCESS_DENIED}
        log.error(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))

    results = getStatData(custom_result)
    data['results'] = results
    log.info("load multi sample stats (%s)" % str(custom_result),
            extra={'user_id': auth.user.id, 'record_id': None, 'table_name': 'results_file'})
    return dict(data=data)

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

        sequence_file_id_sample_sets = {}
        #delete data file
        query = db( (db.sample_set_membership.sample_set_id == sample_set.id)
                    & (db.sequence_file.id == db.sample_set_membership.sequence_file_id)
                ).select(db.sequence_file.id)
        for row in query :
            sample_sets = get_sequence_file_sample_sets(row.id)
            sequence_file_id_sample_sets[row.id] = sample_sets
            if len(sample_sets) == 1:
                db(db.results_file.sequence_file_id == row.id).delete()

        #delete sequence file
        query = db((db.sequence_file.id == db.sample_set_membership.sequence_file_id)
            & (db.sample_set_membership.sample_set_id == sample_set.id)
            ).select(db.sequence_file.id)
        for row in query :
            if not row.id in sequence_file_id_sample_sets: 
                sample_sets = get_sequence_file_sample_sets(row.id)
                sequence_file_id_sample_sets[row.id] = sample_sets
            if len(sequence_file_id_sample_sets[row.id]) == 1:
                db(db.sequence_file.id == row.id).delete()

        #delete patient sample_set
        db(db.sample_set.id == sample_set.id).delete()

        res = {"redirect": "sample_set/all",
               "args": {"type": sample_type, "page": 0},
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
            row.read =  auth.get_group_access("sample_set", request.vars["id"] , row.id)

        log.info("load permission page for sample_set (%s)" % request.vars["id"],
                extra={'user_id': auth.user.id, 'record_id': request.vars['id'], 'table_name': "sample_set"})
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

        error = ""
        if request.vars["group_id"] == "" :
            error += "missing group_id, "
        if ssid == "" :
            error += "missing sample_set_id, "

        if error=="":
            if auth.get_group_access("sample_set",
                      ssid,
                      int(request.vars["group_id"])):
                auth.del_permission(request.vars["group_id"], PermissionEnum.access.value, db["sample_set"], ssid)
                res = {"message" : "access '%s' deleted to '%s'" % (PermissionEnum.access.value, db.auth_group[request.vars["group_id"]].role)}
            else :

                auth.add_permission(request.vars["group_id"], PermissionEnum.access.value, db["sample_set"], ssid)
                res = {"message" : "access '%s' granted to '%s'" % (PermissionEnum.access.value, db.auth_group[request.vars["group_id"]].role)}

            log.info(res, extra={'user_id': auth.user.id, 'record_id': request.vars['sample_set_id'], 'table_name': 'sample_set'})
            return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
        else :
            res = {"message": "incomplete request : "+error }
            log.error(res)
            return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
    else :
        res = {"message": ACCESS_DENIED}
        log.error(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))

def get_sample_set_list(stype, q):
    factory = ModelFactory()
    helper = factory.get_instance(type=stype)

    limitby = None
    if q is not None and len(q) == 0:
        q = None
    if not q :
        limitby = (0, 10)

    filter_query = helper.get_name_filter_query(q)
    query = db(
        (auth.vidjil_accessible_query(PermissionEnum.admin.value, db.sample_set))&
        (db[stype].sample_set_id == db.sample_set.id) &
        (filter_query)
    ).select(
        db[stype].ALL, # sub optimal, use helpers to reduce ?
        orderby = ~db[stype].sample_set_id,
        limitby = limitby
    )
    ss_list = []

    for row in query :
        tmp = helper.get_id_string(row)
        ss_list.append({'name':tmp, 'id': row.sample_set_id, 'type': stype})
    return ss_list

def auto_complete():
    if "keys" not in request.vars:
        return error_message("missing group ids")

    query = json.loads(request.vars['keys'])[0]
    sample_types = [defs.SET_TYPE_PATIENT, defs.SET_TYPE_RUN, defs.SET_TYPE_GENERIC]
    result = []
    for sample_type in sample_types:
        result += get_sample_set_list(sample_type, query)

    res = {}
    res[query] = result
    return json.dumps(res)
