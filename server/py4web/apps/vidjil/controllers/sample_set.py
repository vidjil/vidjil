# -*- coding: utf-8 -*-
import datetime
import pathlib
from sys import modules
from .. import defs
from ..modules import vidjil_utils
from ..modules import tag
from ..modules.stats_decorator import *
from ..modules.sampleSet import SampleSet, get_set_group
from ..modules.sampleSets import SampleSets
from ..modules.sampleSetList import SampleSetList, filter_by_tags
from ..modules.sequenceFile import get_associated_sample_sets, get_sequence_file_sample_sets
from ..modules.controller_utils import error_message
from ..modules.permission_enum import PermissionEnum
from ..modules.zmodel_factory import ModelFactory
from ..user_groups import get_default_creation_group, get_involved_groups
from ..VidjilAuth import VidjilAuth
from io import StringIO
import json
import time
import os
from py4web import action, request, abort, redirect, URL, Field, HTTP, response
from collections import defaultdict
import math
import mimetypes
from ombott import static_file

from ..common import db, session, T, flash, cache, authenticated, unauthenticated, auth, log


##################################
# HELPERS
##################################

ACCESS_DENIED = "access denied"

def getConfigsByClassification():
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

#
#
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
        except:
            pass

##################################
# CONTROLLERS
##################################

## return patient file list
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
        print( "===  config_name: %s" % config_name)

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

    scheduler_ids = {}
    
    ## assign set to each rows
    for row in query:
        row.list_share_set = []
        if row.sequence_file.id in shared_sets:
            for elt in shared_sets[row.sequence_file.id]:
                values = {"title": sets_names[elt],
                          "sample_type": sample_sets[elt].sample_type, "id":elt}
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

    classification   = getConfigsByClassification()

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
    slist = SampleSetList(helper, page, step, tags, search)

    log.debug("list loaded (%.3fs)" % (time.time() - f))

    mid = time.time()

    set_ids = set([s.sample_set_id for s in slist.result])
    admin_permissions = [s.id for s in db(auth.vidjil_accessible_query(PermissionEnum.admin.value, db.sample_set) &  (db.sample_set.id.belongs(set_ids))).select(db.sample_set.id)]
    admin_permissions = list(set(admin_permissions))

    log.debug("permission load (%.3fs)" % (time.time() - mid))

    # failsafe if filtered display all results
    step = len(slist) if step is None else step
    page = 0 if page is None else page
    result = slist.result

    fields = helper.get_fields()
    sort_fields = helper.get_sort_fields()

    ##sort result
    reverse = False
    if "reverse" in request.query:
        reverse = request.query["reverse"]

    if "sort" in request.query:
        result = sorted(result, key = sort_fields[request.query["sort"]]['call'], reverse=reverse)
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
        sset = db(db[set_type].sample_set_id == sample_set.id).select().first()
        if(auth.can_modify_sample_set(sset.sample_set_id)):
            groups = [get_set_group(sset.sample_set_id)]
            action = 'edit'
            max_group = None
        else:
            denied = True
        extra['record_id'] = request.query["id"]

    # new set
    elif (auth.can_create_sample_set()):
        sset = None
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
    sets[set_type].append(sset)
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
            if len(errors) == 0:
                should_register_tags = False
                reset = False

                name = helper.get_name(p)

                # edit
                if (p['sample_set_id'] != ""):
                    if auth.can_modify_sample_set(int(p['sample_set_id'])):
                        reset = True
                        sset = db(db[set_type].sample_set_id == p['sample_set_id']).select().first()
                        db[set_type][sset.id] = p
                        id_sample_set = sset['sample_set_id']

                        if (sset.info != p['info']):
                            group_id = get_set_group(id_sample_set)
                            should_register_tags = True
                            reset = True

                        action = "edit"
                    else:
                        p['error'].append("permission denied")
                        error = True
                        
                # add
                elif (auth.can_create_sample_set_in_group(int(data["group"]))):
                    group_id = int(data["group"])
                    id_sample_set = db.sample_set.insert(sample_type=set_type)

                    p['creator'] = auth.user_id
                    p['sample_set_id'] = id_sample_set
                    p['id'] = db[set_type].insert(**p)
                    should_register_tags = True

                    #patient creator automaticaly has all rights
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
                mes = f"error occured : {p['error']}"
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
        log.info("an error occured")
        #response.view = 'sample_set/form.html'
        return json.dumps(dict(message="an error occured",
                               groups=[{'name': 'foobar', 'id': int(data['group'])}],
                               master_group=data['group'],
                               sets=sets,
                               isEditing = (action=='edit')), 
                          separators=(',',':'))

@action("/vidjil/sample_set/custom", method=["POST", "GET"])
@action.uses("sample_set/custom.html", db, auth.user)
@vidjil_utils.jsontransformer
def custom():
    start = time.time()

    if "config_id" in request.query and request.query["config_id"] != "-1" :
        config_id = int(request.query["config_id"])
        config_name = db.config[request.query["config_id"]].name
        config = True
        
    else:
        request.query["config_id"] = -1
        config_id = -1
        config_name = None
        config = False
        
    if "custom_list" not in request.query :
        request.query["custom_list"] = []
    if type(request.query["custom_list"]) is str :
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
        & (db.results_file.hidden == False)
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
        if (str(row.results_file.id) in request.query["custom_list"]) :
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
        query = query.find(lambda row : ( row.results_file.config_id==config_id or (str(row.results_file.id) in request.query["custom_list"])) )
    
    tag_decorator = tag.TagDecorator(tag.get_tag_prefix())
    log.info("load compare list", extra={'user_id': auth.user_id, 'record_id': None, 'table_name': "results_file"})
    log.debug("sample_set/custom (%.3fs) %s" % (time.time()-start, search))


    classification   = getConfigsByClassification()

    return dict(query=query,
                config_id=config_id,
                config=config,
                helper=helper,
                tag_decorator=tag_decorator,
                classification=classification,
                group_ids=group_ids,
                auth=auth,
                db=db)

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
            res = {"message": 'An error occured. This sample_set may have already been deleted'}
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

            row.parent_access = ', '.join(str(value) for value in auth.get_access_groups(db[stype], request.query['id'], group=row.id))
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
        ssid = request.query["sample_set_id"]
        sample_set = db.sample_set[ssid]
        sample_type = sample_set.sample_type

        error = ""
        if request.query["group_id"] == "" :
            error += "missing group_id, "
        if ssid == "" :
            error += "missing sample_set_id, "

        if error=="":
            if auth.get_group_access("sample_set",
                      ssid,
                      int(request.query["group_id"])):
                auth.del_permission(request.query["group_id"], PermissionEnum.access.value, db["sample_set"], ssid)
                res = {"message" : "access '%s' deleted to '%s'" % (PermissionEnum.access.value, db.auth_group[request.query["group_id"]].role)}
            else :

                auth.add_permission(request.query["group_id"], PermissionEnum.access.value, db["sample_set"], ssid)
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
            ('merged reads', 'parser', m),
            #('mapped_percent', 'parser', p),
            ('read lengths', 'parser', g),
            #('bool', 'parser', b),
            #('bool_true', 'parser', b),
            ('loci', 'parser', l),
            #('distribution', 'parser', lbc),
            #('clones_five_percent', 'parser', m),
            ('main clone', 'parser', m),
            ('pre process', 'parser', m)
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
            if 'merged' in data['reads']:
                dest['merged reads'] = data['reads']['merged'][result_index]
            else:
                dest['merged reads'] = None

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
            if 'pre_process' in data['samples']:
                dest['pre process'] = data['samples']['pre_process']['producer'][result_index]
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
                if head in r.keys():
                    r[head] = model.decorate(r[head])
                else: 
                    r[head] = ""
            r['sequence_file_id'] = res['results_file']['sequence_file_id']
            r['config_id'] = res['results_file']['config_id']
            data.append(r)
    return data

def multi_sample_stats():
    data = {}
    data['headers'] = [h for h, t, m in getStatHeaders()]
    results = []
    custom_result = request.query['custom_result']
    if not isinstance(custom_result, list):
        custom_result = [custom_result]

    custom_result = [int(i) for i in custom_result]

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
        return json.dumps(res, separators=(',',':'))

    results = getStatData(custom_result)
    data['results'] = results
    log.info("load multi sample stats (%s)" % str(custom_result),
            extra={'user_id': auth.user_id, 'record_id': None, 'table_name': 'results_file'})
    return dict(data=data)


@vidjil_utils.jsontransformer
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
    Take two paramaters: set id and set type
    '''
    type    = (request.query['type'] if ("type" in request.query.keys()) else defs.SET_TYPE_GENERIC )
    set_id  =  request.query['id']

    factory = ModelFactory()
    helper  = factory.get_instance(type=type)
    slist   = SampleSetList(helper, setid=set_id)

    return slist.result


@action("/vidjil/sample_set/stats", method=["POST", "GET"])
@action.uses("sample_set/stats.html", db, auth.user)
def stats():
    start = time.time()
    if not auth.user :
        res = {"redirect" : URL('default', 'user', args='login', scheme=True,
                    vars=dict(_next=URL('sample_set', 'all', vars={'type': defs.SET_TYPE_PATIENT}, scheme=True)))
            }
        return json.dumps(res, separators=(',',':'))

    isAdmin = auth.is_admin()
    if request.query['type']:
        type = request.query['type']
    else :
        type = defs.SET_TYPE_GENERIC

    ##filter
    if "filter" not in request.query :
        request.query["filter"] = ""

    search, tags = tag.parse_search(request.query["filter"])
    group_ids = get_involved_groups()

    factory = ModelFactory()
    helper = factory.get_instance(type=type)

    slist = SampleSetList(helper, tags=tags)
    result = slist.result

    fields = helper.get_reduced_fields()

    ##sort result
    reverse = False
    if "reverse" in request.query:
        reverse = request.query["reverse"]
    if "sort" in request.query:
        result = sorted(result, key = lambda row : row[request.query["sort"]], reverse=reverse)
    else:
        result = sorted(result, key = lambda row : row.id, reverse=not reverse)

    classification   = getConfigsByClassification()

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
                classification=classification,
                reverse = False)

@action("/vidjil/sample_set/result_files", method=["POST", "GET"])
@action.uses(db, auth.user)
def result_files():
    from zipfile import ZipFile
    import types
    errors = []
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
        log.error("An error occured when creating archive of sample_sets %s" % str(sample_set_ids))
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

        response.headers['Content-Type'] = "application/json"  # Removed to force file download
        response.headers['Content-Disposition'] = f'attachment; filename="{filename}"'
        log.info("extract results files (%s)" % sample_set_ids, extra={'user_id': auth.user_id,
            'record_id': None,
            'table_name': "sample_set"})
        return static_file(filename, defs.DIR_SEQUENCES, download=True)
    except:
        res = {"message": "an error occurred"}
        log.error("An error occured when creating archive of sample_sets %s" % str(sample_set_ids))
        return json.dumps(res, separators=(',',':'))
    finally:
        try:
            os.unlink(full_path_file)
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
    log.info('stats (%s)' % request.query["id"], extra={'user_id': auth.user_id,
        'record_id': None,
        'table_name': "results_file"})
    log.debug("mystats (%.3fs) %s" % (time.time()-start, request.query["filter"]))
    # Return
    return json.dumps(d, separators=(',',':'))

@action("/vidjil/sample_set/download_sequence_file/<filename>", method=["POST", "GET"])
@action.uses(db, session)
def download(filename=None):
    mimetype = mimetypes.guess_type(defs.DIR_SEQUENCES+filename)
    return static_file(filename, root=defs.DIR_SEQUENCES, download=request.query.filename, mimetype=mimetype[1])
    