# coding: utf8

from datetime import datetime, timedelta
import time
import types

if request.env.http_origin:
    response.headers['Access-Control-Allow-Origin'] = request.env.http_origin
    response.headers['Access-Control-Allow-Credentials'] = 'true'
    response.headers['Access-Control-Max-Age'] = 86400

ACCESS_DENIED = "access denied"

def generic_get_group(element_type):
    group = {}
    separator = "|| ';' ||"
    fields = ["config.name",
              "%s_file.sample_set_id" % element_type,
              "%s_file.config_id" % element_type,
              "sample_set.sample_type"
            ]
    group_concat = "GROUP_CONCAT(DISTINCT  " + separator.join(fields)
    group['patient'] =  group_concat + separator + "patient.first_name || ' ' || patient.last_name || '#')"
    group['run'] = group_concat + separator + "run.name || '#')"
    group['set'] = group_concat + separator + "generic.name || '#')"
    return group

def get_group_fuses():
    return generic_get_group('fused')

def get_group_analyses():
    group = {}
    separator = "|| ';' ||"
    fields = ["analysis_file.sample_set_id",
              "sample_set.sample_type"
            ]
    group_concat = "GROUP_CONCAT(DISTINCT  " + separator.join(fields)
    group['patient'] =  group_concat + separator + "patient.first_name || ' ' || patient.last_name || '#')"
    group['run'] = group_concat + separator + "run.name || '#')"
    group['set'] = group_concat + separator + "generic.name || '#')"
    return group

def group_permissions():
    return "GROUP_CONCAT(DISTINCT auth_permission.name)"

def base_query(group_list):
    return (db.auth_group.id.belongs(group_list) &
        (db.auth_permission.group_id == db.auth_group.id))

def access_query(group_list):
    return (base_query(group_list) &
            (db.auth_permission.table_name == 'sample_set') &
            (db.auth_permission.name == 'access') &
            (db.auth_permission.record_id > 0))

def filter_by_tags(tags):
        return ((db.tag.name.upper().belongs([t.upper() for t in tags])) &
        (db.tag_ref.tag_id == db.tag.id) &
        (db.tag_ref.table_name == 'sequence_file') &
        (db.tag_ref.record_id == db.sample_set_membership.sequence_file_id)
    )

def base_left():
    return [db.sample_set.on(
                db.sample_set.id == db.auth_permission.record_id),
            db.sample_set_membership.on(
                db.sample_set_membership.sample_set_id == db.sample_set.id)]

def get_permissions(group_list):
    return db(db.auth_group.id.belongs(group_list)
        ).select(
            db.auth_group.role,
            group_permissions(),
            left=(db.auth_permission.on(
                (db.auth_permission.group_id == db.auth_group.id) &
                (db.auth_permission.table_name == 'sample_set') &
                (db.auth_permission.record_id == 0))),
            groupby=db.auth_group.role
        )

def get_most_used_tags(group_list):
    left = [
        db.sample_set_membership.on(
            db.sample_set_membership.sample_set_id == db.auth_permission.record_id),
        db.tag_ref.on(
            (db.tag_ref.table_name == 'sequence_file') &
            (db.tag_ref.record_id == db.sample_set_membership.sequence_file_id)),
        db.tag.on(
            db.tag_ref.tag_id == db.tag.id)
    ]

    return db(base_query(group_list)).select(
        db.auth_group.role,
        db.tag_ref.id.count().with_alias('count'),
        db.tag.name,
        left=left,
        groupby=(db.auth_group.role, db.tag.name),
        orderby=~db.tag_ref.id.count(),
        limitby=(0,100)
    )

def index():
    start = time.time()

    since = datetime.today() - timedelta(days=30)

    if auth.is_admin() and 'data' in request.vars:
        import json
        group_list = json.loads(request.vars['data'])['group_ids']
    else:
        group_list = [int(g.id) for g in auth.get_user_groups() + auth.get_user_group_parents()]

    log.debug("group_list: %s" % group_list)

    if "filter" not in request.vars :
        request.vars["filter"] = ""

    search, tags = parse_search(request.vars["filter"])

    result = {}
    perm_query = get_permissions(group_list)
    for r in perm_query:
        if(r.auth_group.role not in result):
            result[r.auth_group.role] = {}
            for set_type in ['patient', 'run', 'set']:
                result[r.auth_group.role][set_type] = {'count': {'num_sets': 0, 'num_samples': 0, 'sample_type': 'generic' if set_type == 'set' else set_type}}
                result[r.auth_group.role][set_type]['tags'] = []
                result[r.auth_group.role][set_type]['statuses'] = ""
                result[r.auth_group.role][set_type]['num_jobs'] = 0
            result[r.auth_group.role]['fuses'] = []
            result[r.auth_group.role]['analyses'] = []
            result[r.auth_group.role]['tags'] = []
        result[r.auth_group.role]['permissions'] = "" if r._extra[group_permissions()] is None else r._extra[group_permissions()].replace(',', ' ')

    query = access_query(group_list)
    if (tags is not None and len(tags) > 0):
        query = (query & filter_by_tags(tags))

    group_statuses = "GROUP_CONCAT(DISTINCT scheduler_task.id || ';' || scheduler_task.status || '#')"
    group_fuses = get_group_fuses()
    group_analyses = get_group_analyses()

    left = base_left() + [
        db.sequence_file.on(
            db.sequence_file.id == db.sample_set_membership.sequence_file_id),
        db.results_file.on(
            db.sample_set_membership.sequence_file_id == db.results_file.sequence_file_id),
        db.scheduler_task.on(
            (db.scheduler_task.id == db.results_file.scheduler_task_id) &
            (db.scheduler_task.start_time >= since)),
        db.fused_file.on(
            (db.fused_file.sample_set_id == db.sample_set.id) &
            (db.fused_file.fuse_date >= since)),
        db.config.on(
            db.config.id == db.fused_file.config_id),
        db.analysis_file.on(
            (db.analysis_file.sample_set_id == db.sample_set.id) &
            (db.analysis_file.analyze_date > since))
    ]

    select = [
        db.auth_group.id,
        db.auth_group.role,
        db.sample_set.sample_type.with_alias('sample_type'),
        db.sample_set.id.count(distinct=True).with_alias('num_sets'),
        db.sample_set_membership.sequence_file_id.count(distinct=True).with_alias('num_samples'),
        group_statuses,
    ]

    queries = {}
    for set_type in ['patient', 'run', 'generic']:
        key = 'set' if set_type == 'generic' else set_type
        set_query = (query &
                    (db[set_type].sample_set_id == db.auth_permission.record_id))

        queries[key] = db(set_query).select(
            group_fuses[key],
            group_analyses[key],
            *select,
            left=left,
            groupby=(db.auth_group.role, db.sample_set.sample_type),
            orderby=~db.scheduler_task.start_time
        )

    list_size = 50
    for key in queries: # patient, run, set
        query = queries[key]
        for r in query: # 1 or 0 rows
            result[r.auth_group.role][key]['count']['num_sets'] += r.num_sets
            result[r.auth_group.role][key]['count']['num_samples'] += r.num_sets
            result[r.auth_group.role][key]['count']['sample_type'] = r.sample_type
            statuses = "" if r._extra[group_statuses] is None else "".join([s.strip('#').split(';')[1][0] for s in r._extra[group_statuses].strip(',').split(',') if s[-1] == '#'])
            result[r.auth_group.role][key]['num_jobs'] = len(statuses)
            result[r.auth_group.role][key]['statuses'] += statuses[:list_size]

            fuses = [] if r._extra[group_fuses[key]] is None else [fuse.strip('#').split(';') for fuse in r._extra[group_fuses[key]].strip(',').split(',') if fuse[-1] == '#']
            result[r.auth_group.role]['fuses'] += (fuses[:list_size])

            analyses = [] if r._extra[group_analyses[key]] is None else [analysis.strip('#').split(';') for analysis in r._extra[group_analyses[key]].strip(',').split(',') if analysis[-1] == '#']
            result[r.auth_group.role]['analyses'] += analyses[:list_size]

    tags = get_most_used_tags(group_list) # list tags used without filtering
    for r in tags:
        if(r.tag.name is not None):
            if r.count > 1:
                tag_string = "%s (%d)" % (r.tag.name, r.count)
            else:
                tag_string = "%s" % r.tag.name
            result[r.auth_group.role]['tags'].append(tag_string)

    involved_group_ids = get_involved_groups() # for search autocomplete

    keys = sorted(result.keys(), key=lambda x: (result[x]['patient']['count']['num_sets'] + result[x]['run']['count']['num_sets'] + result[x]['set']['count']['num_sets']), reverse=True)

    log.debug("my account list (%.3fs)" % (time.time()-start))
    return dict(keys = keys,
                result=result,
                group_ids = group_list,
                involved_group_ids = involved_group_ids)

def jobs():
    since = datetime.today() - timedelta(days=30)

    if auth.is_admin() and 'group_ids' in request.vars and request.vars['group_ids'] is not None:
        group_list = request.vars['group_ids']
        if isinstance(group_list, types.StringTypes):
            group_list = [group_list]
    else:
        group_list = [int(g.id) for g in auth.get_user_groups() + auth.get_user_group_parents()]

    log.debug("group_list: %s" % group_list)

    if "filter" not in request.vars :
        request.vars["filter"] = ""

    search, tags = parse_search(request.vars["filter"])

    query = (access_query(group_list) &
            (db.sample_set.id == db.auth_permission.record_id) &
            (db.sample_set_membership.sample_set_id == db.sample_set.id) &
            (db.sequence_file.id == db.sample_set_membership.sequence_file_id) &
            (db.results_file.sequence_file_id == db.sequence_file.id) &
            (db.config.id == db.results_file.config_id) &
            (db.scheduler_task.id == db.results_file.scheduler_task_id) &
            (db.scheduler_task.start_time > since))

    if (tags is not None and len(tags) > 0):
        query = (query & filter_by_tags(tags))

    names = {}
    names['patient'] = "patient.first_name || ' ' || patient.last_name"
    names['run'] = "run.name"
    names['generic'] = "generic.name"

    queries = {}
    for set_type in ['patient', 'run', 'generic']:
        set_query = (query &
                    (db[set_type].sample_set_id == db.sample_set.id))

        key = 'set' if set_type == 'generic' else set_type
        queries[key] = db(set_query).select(
                names[set_type],
                db.sample_set.id.with_alias('sample_set_id'),
                db.sample_set.sample_type.with_alias('sample_type'),
                db.sequence_file.filename.with_alias('filename'),
                db.sequence_file.info.with_alias('info'),
                db.config.id.with_alias('config_id'),
                db.config.name.with_alias('config'),
                db.scheduler_task.status.with_alias('status'),
                db.scheduler_task.start_time.with_alias('time'),
                orderby=~db.scheduler_task.start_time
            )

    involved_group_ids = get_involved_groups() # for search autocomplete
    tagdecorator = TagDecorator(get_tag_prefix())

    result = []
    for key in queries:
        result += queries[key]

    sorted_start = time.time()
    result = sorted(result, key=lambda x: x.time, reverse=True)
    log.debug("jobs list sort (%.3fs)" % (time.time() - sorted_start))
    return dict(result=result,
                group_ids = group_list,
                involved_group_ids = involved_group_ids,
                tagdecorator = tagdecorator,
                names = names)
