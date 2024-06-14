# -*- coding: utf-8 -*-
import datetime
import pathlib
from .. import defs
from ..modules import vidjil_utils
from ..modules import tag
from ..modules.sampleSet import get_set_group
from ..modules.sampleSets import SampleSets
from ..modules.sampleSetList import SampleSetList, filter_by_tags
from ..modules.sequenceFile import get_associated_sample_sets, get_sequence_file_sample_sets
from ..modules.controller_utils import error_message
from ..modules.permission_enum import PermissionEnum
from ..modules.zmodel_factory import ModelFactory
from ..modules import stats_qc_utils
from ..user_groups import get_default_creation_group, get_involved_groups
import json
import time
import os
from py4web import action, request, URL
from collections import defaultdict
from ombott import static_file

from ..common import db, session, T, auth, log


##################################
# HELPERS
##################################

ACCESS_DENIED = "access denied"


def next_sample_set():
    '''
    Process request, possibly changing request.query['id'] depending on request.query['next']
    '''
    if 'next' in request.query:
        try:
            sample_type = db.sample_set[request.query["id"]].sample_type
            sample_set_id = int(request.query['id'])
            
            go_next = int(request.query['next'])
            same_type_with_permissions = (db.sample_set.sample_type == sample_type) & (auth.vidjil_accessible_query(PermissionEnum.read.value, db.sample_set))
            if go_next > 0:
                res = db((db.sample_set.id > sample_set_id) & (same_type_with_permissions)).select(
                    db.sample_set.id, orderby=db.sample_set.id, limitby=(0,1))
            else:
                res = db((db.sample_set.id < sample_set_id) & (same_type_with_permissions)).select(
                    db.sample_set.id, orderby=~db.sample_set.id, limitby=(0,1))
            if (len(res) > 0):
                request.query["id"] = str(res[0].id)
        except Exception:
            pass

##################################
# CONTROLLERS
##################################

## return samples list for a sample set
##
@action("/vidjil/sample_set/index", method=["POST", "GET"])
@action.uses("sample_set/index.html", db, auth.user)
@vidjil_utils.jsontransformer
def index():

    next_sample_set()
    if not auth.can_view_sample_set(int(request.query["id"])):
        res = {"message": ACCESS_DENIED}
        log.error(res)  
        return json.dumps(res, separators=(',',':'))

    sample_set = db.sample_set[request.query["id"]]
    owners = db((db.auth_permission.record_id == request.query["id"])
        & (db.auth_permission.name == "access")
        & (db.auth_permission.table_name == "sample_set")
        & (db.auth_group.id == db.auth_permission.group_id)
        ).select(db.auth_group.id,db.auth_group.role, db.auth_permission.table_name,db.auth_permission.record_id)

    sample_set_id = sample_set.id
    factory = ModelFactory()
    helper = factory.get_instance(type=sample_set.sample_type)
    data = helper.get_data(sample_set_id)
    info_file = helper.get_info_dict(data)

    if "config_id" in request.query and request.query["config_id"] != "-1":
        config_id = int(request.query["config_id"])
        config = True
    elif "config_id" in request.query and request.query["config_id"] == "-1":
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
                & (db.results_file.hidden == False)  # noqa: E712
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
                    & (db.results_file.hidden == False)  # noqa: E712
                )
            )


    all_sequence_files = [r.sample_set_membership.sequence_file_id for r in query]

    (shared_sets, sample_sets_dict) = get_associated_sample_sets(all_sequence_files, [sample_set_id])
    
    sample_sets = SampleSets(sample_sets_dict.keys())
    sets_names = sample_sets.get_names()

    scheduler_ids = {}
    
    ## assign set to each rows
    for row in query:
        row.list_share_set = []
        if row.sequence_file.id in shared_sets:
            for elt in shared_sets[row.sequence_file.id]:
                values = {"title": sets_names[elt],
                          "sample_type": sample_sets_dict[elt].sample_type, "id":elt}
                row.list_share_set.append(values)
        if row.results_file.scheduler_task_id:
            scheduler_ids[row.results_file.scheduler_task_id] = row.results_file
        row.results_file.status = ''

    schedulers = db(db.scheduler_task.id.belongs(scheduler_ids.keys())).select()
    for s in schedulers:
        scheduler_ids[s.id].status = s.status
    

    tag_decorator = tag.TagDecorator(tag.get_tag_prefix())
    query_pre_process = db( db.pre_process.id >0 ).select()
    pre_process_list = {}
    for row in query_pre_process:
        pre_process_list[row.id] = row.name

    classification   = get_configs_by_classification()

    http_origin = ""
    if 'HTTP_ORIGIN' in request.environ :
        http_origin = request.environ['HTTP_ORIGIN'] + "/"

    log.info('sample_set (%s)' % request.query["id"], extra={'user_id': auth.user_id,
        'record_id': request.query["id"],
        'table_name': "sample_set"})
    #if (auth.can_view_patient(request.query["id"]) ):
    return dict(query=query,
                owners=owners,
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
                sample_type = db.sample_set[request.query["id"]].sample_type,
                config=config,
                classification=classification,
                tag_decorator=tag_decorator,
                http_origin=http_origin,
                auth=auth,
                db=db)

## return a list of generic sample_sets
@action("/vidjil/sample_set/all", method=["POST", "GET"])
@action.uses("sample_set/all.html", db, auth.user)
@vidjil_utils.jsontransformer
def all():
    start = time.time()
    if request.query.get('type'):
        type = request.query.get('type')
    else :
        type = defs.SET_TYPE_GENERIC

    if not auth.user :
        res = {"redirect" : URL('default', 'user', args='login', scheme=True,
                    vars=dict(_next=URL('sample_set', 'all', vars={'type': type, 'page': 0}, scheme=True)))
            }
        return json.dumps(res, separators=(',',':'))

    isAdmin = auth.is_admin()

    step = None
    page = None
    if request.query.get('page') is not None:
        page = int(request.query.get('page'))
        step = 50

    ##filter
    if "filter" not in request.query :
        request.query["filter"] = ""

    search, tags = tag.parse_search(request.query["filter"])
    group_ids = get_involved_groups()

    factory = ModelFactory()
    helper = factory.get_instance(type)

    f = time.time()
    sample_set_list = SampleSetList(helper, page, step, tags, search)

    log.debug("list loaded (%.3fs)" % (time.time() - f))

    mid = time.time()

    set_ids = set([s.sample_set_id for s in sample_set_list.result])
    admin_permissions = [s.id for s in db(auth.vidjil_accessible_query(PermissionEnum.admin.value, db.sample_set) &  (db.sample_set.id.belongs(set_ids))).select(db.sample_set.id)]
    admin_permissions = list(set(admin_permissions))

    log.debug("permission load (%.3fs)" % (time.time() - mid))

    # failsafe if filtered display all results
    step = len(sample_set_list) if step is None else step
    page = 0 if page is None else page
    result = sample_set_list.result

    fields = helper.get_fields()
    sort_fields = helper.get_sort_fields()

    ##sort result
    reverse = False
    if "reverse" in request.query:
        reverse = True

    if "sort" in request.query:
        result = sorted(result, key = sort_fields[request.query['sort']]['sort_call'], reverse=reverse)
    else:
        request.query["sort"] = ""
        result = sorted(result, key = lambda row : row.id, reverse=not reverse)

    log.info("%s list %s" % (type, search), extra={'user_id': auth.user_id,
        'record_id': None,
        'table_name': "sample_set"})
    log.debug("sample_set list (%.3fs)" % (time.time()-start))

    return dict(query= result,
                fields= fields,
                helper = helper,
                group_ids = group_ids,
                admin_permissions = admin_permissions,
                isAdmin = isAdmin,
                reverse = reverse,
                step = step,
                page= page,
                db=db,
                auth=auth)


## return form to create new set
@action("/vidjil/sample_set/form", method=["POST", "GET"])
@action.uses("sample_set/form.html", db, auth.user)
@vidjil_utils.jsontransformer
def form():
    denied = False
    # edit set
    extra = {'user_id': auth.user_id, 'record_id': None, 'table_name': "sample_set"}
    if("id" in request.query):
        sample_set = db.sample_set[request.query["id"]]
        set_type = sample_set.sample_type
        sample_set = db(db[set_type].sample_set_id == sample_set.id).select().first()
        if(auth.can_modify_sample_set(sample_set.sample_set_id)):
            groups = [get_set_group(sample_set.sample_set_id)]
            action = 'edit'
            max_group = None
        else:
            denied = True
        extra['record_id'] = request.query["id"]

    # new set
    elif (auth.can_create_sample_set()):
        sample_set = None
        set_type = request.query["type"]
        creation_group_tuple = get_default_creation_group(auth)
        groups = creation_group_tuple[0]
        max_group = creation_group_tuple[1]
        action = 'add'
    else :
        denied = True

    if denied:
        res = {"message": ACCESS_DENIED}
        log.error(res)
        return json.dumps(res, separators=(',',':'))

    message = '%s %s' % (action, set_type)
    sets = {defs.SET_TYPE_PATIENT: [],
            defs.SET_TYPE_RUN: [],
            defs.SET_TYPE_GENERIC: []}
    # We add a None object to the desired set type to initialise an empty form in the template.
    sets[set_type].append(sample_set)
    log.info("load form " + message, extra=extra)
    return dict(message=T(message),
                groups=groups,
                group_ids = get_involved_groups(),
                master_group=max_group,
                sets=sets,
                isEditing = (action=='edit'),
                auth=auth,
                db=db)



## create a patient if the html form is complete
## need ["first_name", "last_name", "birth_date", "info"]
## redirect to patient list if success
## return a flash error message if fail
@action("/vidjil/sample_set/submit", method=["POST", "GET"])
@action.uses(db, auth.user)
@vidjil_utils.jsontransformer
def submit():
    data = json.loads(request.params['data'])
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
            p['error'] = errors
            action = "add"
            should_register_tags = False
            if len(errors) == 0:
                reset = False

                name = helper.get_name(p)

                # edit
                if (p['sample_set_id'] != ""):
                    if auth.can_modify_sample_set(int(p['sample_set_id'])):
                        reset = True
                        sample_set = db(db[set_type].sample_set_id == p['sample_set_id']).select().first()
                        db[set_type][sample_set.id] = p
                        id_sample_set = sample_set['sample_set_id']

                        if (sample_set.info != p['info']):
                            group_id = get_set_group(id_sample_set)
                            should_register_tags = True
                            reset = True

                        action = "edit"
                    else:
                        p['error'].append("permission denied")
                        error = True
                        
                # add
                elif (auth.can_create_sample_set()):
                    group_id = int(data["group"])
                    id_sample_set = db.sample_set.insert(sample_type=set_type)

                    p['creator'] = auth.user_id
                    p['sample_set_id'] = id_sample_set
                    p['id'] = db[set_type].insert(**p)
                    should_register_tags = True

                    #patient creator automatically has all rights
                    auth.add_permission(group_id, PermissionEnum.access.value, 'sample_set', p['sample_set_id'])

                    action = "add"

                    #if (p['id'] % 100) == 0:
                    #    mail.send(to=defs.ADMIN_EMAILS,
                    #    subject=defs.EMAIL_SUBJECT_START+" %d" % p['id'],
                    #    message="The %dth %s has just been created." % (p['id'], set_type))

                else :
                    p['error'].append("permission denied")
                    error = True
            else:
                error = True
            
            if error:
                mes = f"error occurred : {p['error']}"
                id_sample_set = -1
            else:
                mes = u"%s (%s) %s %sed" % (set_type, id_sample_set, name, action)
            p['message'] = [mes]
            log.info(mes, extra={'user_id': auth.user_id, 'record_id': id_sample_set, 'table_name': 'sample_set'})
            if should_register_tags:
                tag.register_tags(db, set_type, p["id"], p["info"], group_id, reset=reset)
            
    if not error:
        if not bool(length_mapping):
            creation_group_tuple = get_default_creation_group(auth)
            #response.view = 'sample_set/form.html'
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
        return json.dumps(res, separators=(',',':'))
    else:
        sets = {
                'patient': data['patient'] if 'patient' in data else [],
                'run': data['run'] if 'run' in data else [],
                'generic': data['generic'] if 'generic' in data else []
                }
        log.info("an error occurred")
        #response.view = 'sample_set/form.html'
        return json.dumps(dict(message="an error occurred",
                               groups=[{'name': 'foobar', 'id': int(data['group'])}],
                               master_group=data['group'],
                               sets=sets,
                               isEditing = (action=='edit')), 
                          separators=(',',':'))

@action("/vidjil/sample_set/custom", method=["POST", "GET"])
@action.uses("sample_set/custom.html", db, auth.user)
@vidjil_utils.jsontransformer
def custom():
    log.debug(f"Calling custom with {request.query=}")
    
    if "id" not in request.query:
        # TODO : better deal with this case, but it fails for now
        res = {"success": "false", "message": "Missing field id"}
        log.error(res)
        return json.dumps(res, separators=(',',':'))
    
    start = time.time()

    if "config_id" in request.query and request.query["config_id"] != "-1" :
        config_id = int(request.query["config_id"])
        config = True
    else:
        request.query["config_id"] = -1
        config_id = -1 
        config = False
        
    if "custom_list" not in request.query :
        request.query["custom_list"] = []
    if isinstance(request.query["custom_list"], str) :
        request.query["custom_list"] = [request.query["custom_list"]]
        
    myGroupBy = None
    helper = None
    if request.query["id"] and auth.can_view_sample_set(int(request.query["id"])):
        sample_set = db.sample_set[request.query["id"]]
        factory = ModelFactory()
        helper = factory.get_instance(type=sample_set.sample_type)
        qq = (db.sample_set.id == request.query["id"])
    else:
        qq = (auth.vidjil_accessible_query(PermissionEnum.read.value, db.sample_set))
        myGroupBy = db.sequence_file.id|db.patient.id|db.run.id|db.generic.id|db.results_file.config_id

    q = (qq
        & (auth.vidjil_accessible_query(PermissionEnum.read_config.value, db.config))
        & (db.sample_set_membership.sample_set_id == db.sample_set.id)
        & (db.sequence_file.id == db.sample_set_membership.sequence_file_id)
        & (db.results_file.sequence_file_id==db.sequence_file.id)
        & (db.results_file.data_file != '')
        & (db.results_file.hidden == False)  # noqa: E712
        & (db.config.id==db.results_file.config_id))

    group_ids = get_involved_groups()

    ##filter
    if "filter" not in request.query :
        request.query["filter"] = ""

    search, tags = tag.parse_search(request.query["filter"])

    left_join = [
        db.patient.on(db.patient.sample_set_id == db.sample_set.id),
        db.run.on(db.run.sample_set_id == db.sample_set.id),
        db.generic.on(db.generic.sample_set_id == db.sample_set.id)
    ]

    select = [
        db.patient.id, db.patient.sample_set_id, db.patient.info, db.patient.first_name, db.patient.last_name,
        db.run.id, db.run.info, db.run.name,
        db.generic.id, db.generic.info, db.generic.name,
        db.results_file.id, db.results_file.config_id, db.results_file.hidden, db.sequence_file.sampling_date,
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

    for visible_row in query :
        visible_row.checked = False
        if (str(visible_row.results_file.id) in request.query["custom_list"]) :
            visible_row.checked = True

        if visible_row.patient.id is not None:
            #TODO use helper.
            visible_row.names = vidjil_utils.display_names(visible_row.patient.sample_set_id, visible_row.patient.first_name, visible_row.patient.last_name)
            info = visible_row.patient.info
        elif visible_row.run.id is not None:
            visible_row.names = visible_row.run.name
            info = visible_row.run.info
        elif visible_row.generic.id is not None:
            visible_row.names = visible_row.generic.name
            info = visible_row.generic.info
        visible_row.string = [visible_row.names, visible_row.sequence_file.filename, str(visible_row.sequence_file.sampling_date), str(visible_row.sequence_file.pcr), str(visible_row.config.name), str(visible_row.results_file.run_date), info]
    
    query = query.find(lambda row : ( vidjil_utils.advanced_filter(row.string,search) or row.checked) )

    if config :
        query = query.find(lambda row : ( row.results_file.config_id==config_id or (str(row.results_file.id) in request.query["custom_list"])) )
    
    tag_decorator = tag.TagDecorator(tag.get_tag_prefix())
    log.info("load compare list", extra={'user_id': auth.user_id, 'record_id': None, 'table_name': "results_file"})
    log.debug("sample_set/custom (%.3fs) %s" % (time.time()-start, search))

    classification = get_configs_by_classification()

    ## For each config, get a list of all samples last analyses, ie not hidden
    config_samples = get_config_samples(query)

    return dict(query=query,
                config_id=config_id,
                config=config,
                helper=helper,
                tag_decorator=tag_decorator,
                classification=classification,
                config_samples=config_samples,
                group_ids=group_ids,
                auth=auth,
                db=db)
    


def get_configs_by_classification():
    """ Return list of available and auth config, classed by classification values """
    i = 0
    classification   = defaultdict( lambda: {"info":"", "name":"", "configs":[]} )
    if auth.can_process_sample_set(int(request.query['id'])) :
        for class_elt in db( (db.classification)).select(orderby=db.classification.id):
            configs = db( (db.config.classification == class_elt.id) & (auth.vidjil_accessible_query(PermissionEnum.read.value, db.config) | auth.vidjil_accessible_query(PermissionEnum.admin.value, db.config) ) ).select(orderby=db.config.name)
            if len(configs): # don't show empty optgroup
                classification["%02d_%s" % (i, class_elt)]["name"]    = class_elt.name
                classification["%02d_%s" % (i, class_elt)]["info"]    = class_elt.info
                classification["%02d_%s" % (i, class_elt)]["configs"] = configs
            i += 1
        classification["%02d_noclass" % i]["name"]    = "-"
        classification["%02d_noclass" % i]["info"]    = ""
        classification["%02d_noclass" % i]["configs"] = db( (db.config.classification == None) & (auth.vidjil_accessible_query(PermissionEnum.read.value, db.config) | auth.vidjil_accessible_query(PermissionEnum.admin.value, db.config) ) ).select(orderby=db.config.name)
    return classification
   

def get_config_samples(query):
    """
    For each config, get a list of all samples last analyses
    """
    
    # Get a list of all results for a config, a sequence file, with run time
    config_samples_with_times = dict()
    for row in query:
        config_name = row.config.name
        sequence_file_id = row.sequence_file.id
        run_date = row.results_file.run_date
        results_file_id = int(row.results_file.id)
        
        if config_name not in config_samples_with_times:
            config_samples_with_times[config_name] = dict()
        if sequence_file_id not in config_samples_with_times[config_name]:
            config_samples_with_times[config_name][sequence_file_id] = []
        config_samples_with_times[config_name][sequence_file_id].append((run_date, results_file_id))
    
    # Keep only the last result for each sequence file for a given config, grouped by config
    config_samples = dict()
    for config_name, sample_sets_results in config_samples_with_times.items():
        config_samples[config_name] = []
        for results_id_with_times in sample_sets_results.values():
            config_samples[config_name].append(max(results_id_with_times, key=lambda item: item[0])[1])
    
    return config_samples

@action("/vidjil/sample_set/confirm", method=["POST", "GET"])
@action.uses("sample_set/confirm.html", db, auth.user)
@vidjil_utils.jsontransformer
def confirm():
    if auth.can_modify_sample_set(int(request.query["id"])):
        sample_set = db.sample_set[request.query["id"]]
        data = db(db[sample_set.sample_type].sample_set_id == sample_set.id).select().first()
        factory = ModelFactory()
        helper = factory.get_instance(type=sample_set.sample_type)
        log.debug('request sample_set deletion')
        return dict(message=T('confirm sample_set deletion'),
                    data=data,
                    helper=helper,
                    auth=auth,
                    db=db)
    else :
        res = {"message": ACCESS_DENIED}
        log.error(res)
        return json.dumps(res, separators=(',',':'))

@action("/vidjil/sample_set/delete", method=["POST", "GET"])
@action.uses(db, auth.user)
def delete():
    if (auth.can_modify_sample_set(int(request.query["id"])) ):
        sample_set = db.sample_set[request.query["id"]]
        sample_type = sample_set.sample_type
        if sample_set is None:
            res = {"message": 'An error occurred. This sample_set may have already been deleted'}
            log.error(res)
            return json.dumps(res, separators=(',',':'))

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
            if row.id not in sequence_file_id_sample_sets: 
                sample_sets = get_sequence_file_sample_sets(row.id)
                sequence_file_id_sample_sets[row.id] = sample_sets
            if len(sequence_file_id_sample_sets[row.id]) == 1:
                db(db.sequence_file.id == row.id).delete()

        #delete patient sample_set
        db(db.sample_set.id == sample_set.id).delete()

        res = {"redirect": "sample_set/all",
               "args": {"type": sample_type, "page": 0},
               "success": "true",
               "message": "sample set ("+str(request.query["id"])+") deleted"}
        log.info(res, extra={'user_id': auth.user_id, 'record_id': request.query["id"], 'table_name': 'sample_set'})
        return json.dumps(res, separators=(',',':'))
    else :
        res = {"message": ACCESS_DENIED}
        log.error(res)
        return json.dumps(res, separators=(',',':'))

#
@action("/vidjil/sample_set/permission", method=["POST", "GET"])
@action.uses("sample_set/permission.html", db, auth.user)
@vidjil_utils.jsontransformer
def permission():
    if (auth.can_modify_sample_set(int(request.query["id"])) ):
        sample_set = db.sample_set[request.query["id"]]
        sample_type = sample_set.sample_type
        factory = ModelFactory()
        helper = factory.get_instance(type=sample_type)

        data = db(db[sample_type].sample_set_id == sample_set.id).select().first()

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

            row.parent_access = ', '.join(str(value) for value in auth.get_access_groups(db[sample_type], request.query['id'], group=row.id))
            row.read =  auth.get_group_access("sample_set", request.query["id"] , row.id)

        log.info("load permission page for sample_set (%s)" % request.query["id"],
                extra={'user_id': auth.user_id, 'record_id': request.query['id'], 'table_name': "sample_set"})
        return dict(query=query,
                    helper=helper,
                    data=data,
                    auth=auth,
                    db=db)
    else :
        res = {"message": ACCESS_DENIED}
        log.error(res)
        return json.dumps(res, separators=(',',':'))

#
@action("/vidjil/sample_set/change_permission", method=["POST", "GET"])
@action.uses(db, auth.user)
def change_permission():
    if (auth.can_modify_sample_set(int(request.query["sample_set_id"])) ):
        sample_set_id = request.query["sample_set_id"]

        error = ""
        if request.query["group_id"] == "" :
            error += "missing group_id, "
        if sample_set_id == "" :
            error += "missing sample_set_id, "

        if error=="":
            if auth.get_group_access("sample_set",
                      sample_set_id,
                      int(request.query["group_id"])):
                auth.del_permission(request.query["group_id"], PermissionEnum.access.value, db["sample_set"], sample_set_id)
                res = {"message" : "access '%s' deleted to '%s'" % (PermissionEnum.access.value, db.auth_group[request.query["group_id"]].role)}
            else :

                auth.add_permission(request.query["group_id"], PermissionEnum.access.value, db["sample_set"], sample_set_id)
                res = {"message" : "access '%s' granted to '%s'" % (PermissionEnum.access.value, db.auth_group[request.query["group_id"]].role)}

            log.info(res, extra={'user_id': auth.user_id, 'record_id': request.query['sample_set_id'], 'table_name': 'sample_set'})
            return json.dumps(res, separators=(',',':'))
        else :
            res = {"message": "incomplete request : "+error }
            log.error(res)
            return json.dumps(res, separators=(',',':'))
    else :
        res = {"message": ACCESS_DENIED}
        log.error(res)
        return json.dumps(res, separators=(',',':'))


@action("/vidjil/sample_set/multi_sample_stats", method=["POST", "GET"])
@action.uses("sample_set/multi_sample_stats.html", db, auth.user)
def multi_sample_stats():
    
    if "results_ids" in request.query:
        results_ids = request.query["results_ids"]
        if not isinstance(results_ids, list):
            results_ids = [results_ids]
        results_ids = [int(i) for i in results_ids]
    else:
        if "config_id" in request.query and "sample_set_id" in request.query:
            config_id = request.query["config_id"]
            sample_set_id = request.query["sample_set_id"]
            query = db((db.sequence_file.id == db.sample_set_membership.sequence_file_id) & 
                        (db.sample_set_membership.sample_set_id == sample_set_id)).select(
                            left=db.results_file.on(
                                (db.results_file.sequence_file_id==db.sequence_file.id)
                                & (db.results_file.config_id==str(config_id))
                                & (db.results_file.hidden == False)  # noqa: E712
                            ),
                        orderby = db.sequence_file.id|~db.results_file.run_date)

            results_ids=[]
            previous=-1
            for row in query :
                if row.sequence_file.id != previous :
                    if row.results_file.id:
                        results_ids.append(int(row.results_file.id))
                        previous=row.sequence_file.id
        else:
            res = {"message": "Missing results_ids or config_id and sample_set_id in query"}
            log.error(res)
            return json.dumps(res, separators=(',',':'))

    data = {}
    data["headers"] = stats_qc_utils.get_stat_headers()
    data["default_hidden_columns"] = [index+1 for index, header in enumerate(stats_qc_utils.get_stat_headers().values()) if header.hidden_by_default]
    display_stats_results, json_stats_data = stats_qc_utils.get_stat_data(results_ids)
    data["results"] = display_stats_results

    permitted_results = db((auth.vidjil_accessible_query(PermissionEnum.read.value, db.sample_set)) & 
                           (db.sample_set.id == db.sample_set_membership.sample_set_id) &
                           (db.sample_set_membership.sequence_file_id == db.results_file.sequence_file_id) &
                           (db.results_file.id.belongs(results_ids))
                           ).select()
    permitted_results_ids = [permitted_result.results_file.id for permitted_result in permitted_results]
    if set(permitted_results_ids) != set(results_ids):
        res = {"message": ACCESS_DENIED}
        log.error(res)
        return json.dumps(res, separators=(',', ':'))
    
    http_origin = ""
    if "HTTP_ORIGIN" in request.environ :
        http_origin = request.environ["HTTP_ORIGIN"] + os.sep
    
    log.info(f"load multi sample stats ({str(results_ids)})",
             extra={"user_id": auth.user_id, "record_id": None, "table_name": "results_file"})
    return dict(data=data,
                json_stats_data=json_stats_data,
                auth=auth,
                db=db,
                permitted_results=permitted_results,
                permitted_results_ids=permitted_results_ids,
                http_origin=http_origin)


@vidjil_utils.jsontransformer
def get_sample_set_list(sample_set_type, q):
    factory = ModelFactory()
    helper = factory.get_instance(type=sample_set_type)

    limit_by = None
    if q is not None and len(q) == 0:
        q = None
    if not q :
        limit_by = (0, 10)

    filter_query = helper.get_name_filter_query(q)
    query = db(
        (auth.vidjil_accessible_query(PermissionEnum.admin.value, db.sample_set))&
        (db[sample_set_type].sample_set_id == db.sample_set.id) &
        (filter_query)
    ).select(
        db[sample_set_type].ALL, # sub optimal, use helpers to reduce ?
        orderby = ~db[sample_set_type].sample_set_id,
        limitby = limit_by
    )
    ss_list = []

    for row in query :
        tmp = helper.get_id_string(row)
        ss_list.append({'name':tmp, 'id': row.sample_set_id, 'type': sample_set_type})
    return ss_list


@action("/vidjil/sample_set/auto_complete", method=["POST", "GET"])
@action.uses(db, auth.user)
def auto_complete():
    if "keys" not in request.params:
        return error_message("missing group ids")

    query = json.loads(request.params["keys"])[0]
    sample_types = [defs.SET_TYPE_PATIENT, defs.SET_TYPE_RUN, defs.SET_TYPE_GENERIC]
    result = []
    for sample_type in sample_types:
        result += get_sample_set_list(sample_type, query)

    res = {}
    res[query] = result
    return json.dumps(res)

@action("/vidjil/sample_set/samples")
@action.uses(db, auth.user)
@vidjil_utils.jsontransformer
def samples():
    '''
    API: List of samples, possibly filtered
    '''
    res = all()
    export = dict(samples = res['query'],
                  group_ids = res['group_ids'],
                  step = res['step'],
                  page = res['page'])
    return sorted(export, key = lambda row : row.id)

@action("/vidjil/sample_set/samplesetById")
@action.uses(db, auth.user)
@vidjil_utils.jsontransformer
def samplesetById():
    '''
    API: Get a specific sample based on the set id
    Take two parameters: set id and set type
    '''
    type = (request.query['type'] if ("type" in request.query.keys()) else defs.SET_TYPE_GENERIC )
    set_id =  request.query['id']

    factory = ModelFactory()
    helper = factory.get_instance(type=type)
    sample_set_list = SampleSetList(helper, setid=set_id)

    return sample_set_list.result


@action("/vidjil/sample_set/stats", method=["POST", "GET"])
@action.uses("sample_set/stats.html", db, auth.user)
def stats():
    start = time.time()
    if not auth.user :
        res = {"redirect" : URL('default', 'user', args='login', scheme=True,
                                vars=dict(_next=URL('sample_set', 'all', vars={'type': defs.SET_TYPE_PATIENT}, scheme=True)))}
        return json.dumps(res, separators=(',',':'))

    isAdmin = auth.is_admin()
    if request.query['type']:
        type = request.query['type']
    else :
        type = defs.SET_TYPE_GENERIC

    ## filter
    if "filter" not in request.query :
        request.query["filter"] = ""

    search, tags = tag.parse_search(request.query["filter"])
    group_ids = get_involved_groups()

    factory = ModelFactory()
    helper = factory.get_instance(type=type)

    sample_set_list = SampleSetList(helper, tags=tags)
    result = sample_set_list.result

    fields = helper.get_reduced_fields()

    ## sort result
    reverse = False
    if "reverse" in request.query:
        reverse = request.query["reverse"]
    if "sort" in request.query:
        result = sorted(result, key = lambda row : row[request.query["sort"]], reverse=reverse)
    else:
        result = sorted(result, key = lambda row : row.id, reverse=not reverse)

    classification   = get_configs_by_classification()

    result = helper.filter(search, result)
    log.info("%s stat list %s" % (request.query["type"], search), extra={'user_id': auth.user_id,
        'record_id': None,
        'table_name': "sample_set"})
    log.debug("stat list (%.3f s)" % (time.time()-start))

    return dict(query = result,
                fields = fields,
                helper = helper,
                group_ids = group_ids,
                isAdmin = isAdmin,
                classification = classification,
                reverse = False)

@action("/vidjil/sample_set/result_files", method=["POST", "GET"])
@action.uses(db, auth.user)
def result_files():
    from zipfile import ZipFile
    import types
    config_id = request.query['config_id']
    sample_set_ids = []
    if 'sample_set_ids' in request.query:
        sample_set_ids = request.query['sample_set_ids']

    #little hack since we can't pass array parameters with only one value
    if isinstance(sample_set_ids, types.StringTypes):
        sample_set_ids = [sample_set_ids]

    permissions = [auth.can_view_sample_set(int(id)) for id in sample_set_ids]
    if sum(permissions) < len(permissions):
        res = {"message": "You don't have permissions to access those sample sets"}
        log.error("An error occurred when creating archive of sample_sets %s" % str(sample_set_ids))
        return json.dumps(res, separators=(',',':'))


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
            (db.results_file.data_file != None) &  # noqa: E711
            (db.results_file.hidden == False) &  # noqa: E712
            config_query
        )

    results = q.select(db.results_file.ALL, db.sequence_file.ALL, db.sample_set.ALL, db.patient.ALL, db.run.ALL, db.generic.ALL, left=left_join)

    sample_types = ['patient', 'run', 'generic']
    mf = ModelFactory()
    helpers = {}

    for t in sample_types:
        helpers[t] = mf.get_instance(type=t)

    filename = "export_%s_%s.zip" % ('-'.join(sample_set_ids), str(datetime.date.today()))
    full_path_file = pathlib.Path(defs.DIR_SEQUENCES, filename)
    try:
        with ZipFile(full_path_file, 'w') as zipfile:
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

        log.info("extract results files (%s)" % sample_set_ids, extra={'user_id': auth.user_id,
            'record_id': None,
            'table_name': "sample_set"})
        return static_file(filename, defs.DIR_SEQUENCES, download=True)
    except Exception as exception:
        res = {"message": "an error occurred"}
        log.error(f"An error occurred when creating archive of sample_sets {sample_set_ids} : {exception}")
        return json.dumps(res, separators=(',',':'))
    finally:
        try:
            os.unlink(full_path_file)
        except OSError:
            pass

@action("/vidjil/sample_set/download_sequence_file/<filename>", method=["POST", "GET"])
@action.uses(db, session, auth.user)
def download(filename=None):
    return static_file(filename, root=defs.DIR_SEQUENCES, download=True)
    