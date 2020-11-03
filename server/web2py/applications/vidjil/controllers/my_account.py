# coding: utf8

from datetime import datetime, timedelta
import time
import types

if request.env.http_origin:
    response.headers['Access-Control-Allow-Origin'] = request.env.http_origin
    response.headers['Access-Control-Allow-Credentials'] = 'true'
    response.headers['Access-Control-Max-Age'] = 86400

ACCESS_DENIED = "access denied"

def get_group_fuses():
    group_fuses = {}
    separator = "|| ';' ||"
    fields = ["config.name",
              "fused_file.sample_set_id",
              "fused_file.config_id ",
              "sample_set.sample_type"
            ]
    group_concat = "GROUP_CONCAT(DISTINCT  " + separator.join(fields)
    group_fuses['patient'] =  group_concat + separator + "patient.first_name || ' ' || patient.last_name)"
    group_fuses['run'] = group_concat + separator + "run.name)"
    group_fuses['set'] = group_concat + separator + "generic.name)"
    return group_fuses

def group_permissions():
    return "GROUP_CONCAT(DISTINCT auth_permission.name)"

def base_query(group_list):
    return (db.auth_group.id.belongs(group_list) &
        (db.auth_permission.group_id == db.auth_group.id))

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

def group_tags():
    return "GROUP_CONCAT(DISTINCT tag.name)"

def get_tags(group_list):
    left = [
        db.sample_set.on(
            db.auth_permission.record_id == db.sample_set.id),
        db.sample_set_membership.on(
            db.sample_set_membership.sample_set_id == db.sample_set.id),
        db.tag_ref.on(
            (db.tag_ref.table_name == 'sequence_file') &
            (db.tag_ref.record_id == db.sample_set_membership.sequence_file_id)),
        db.tag.on(
            db.tag_ref.tag_id == db.tag.id)
    ]

    return db(base_query(group_list)).select(
        db.auth_group.role,
        group_tags(),
        left=left,
        groupby=db.auth_group.role
    )

def index():
    start = time.time()

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


    result = {}
    perm_query = get_permissions(group_list)
    for r in perm_query:
        if(r.auth_group.role not in result):
            result[r.auth_group.role] = {}
            for set_type in ['patient', 'run', 'set']:
                result[r.auth_group.role][set_type] = {'count': {'num_sets': 0, 'num_samples': 0, 'sample_type': 'generic' if set_type == 'set' else set_type}}
                result[r.auth_group.role][set_type]['tags'] = []
                result[r.auth_group.role][set_type]['statuses'] = ""
            result[r.auth_group.role]['fuses'] = []
            result[r.auth_group.role]['tags'] = []
        result[r.auth_group.role]['permissions'] = [] if r._extra[group_permissions()] is None else r._extra[group_permissions()]

    query = (base_query(group_list) &
            (db.auth_permission.name == 'access') &
            (db.auth_permission.record_id > 0))
    if (tags is not None and len(tags) > 0):
        query = (query &
            (db.tag.name.upper().belongs([t.upper() for t in tags])) &
            (db.tag_ref.tag_id == db.tag.id) &
            (db.tag_ref.table_name == 'sequence_file') &
            (db.tag_ref.record_id == db.sample_set_membership.sequence_file_id)
        )

    group_statuses = "GROUP_CONCAT(DISTINCT scheduler_task.id || ';' || scheduler_task.status)"
    group_fuses = get_group_fuses()

    queries = {}

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
            db.config.id == db.fused_file.config_id)
    ]

    select = [
        db.auth_group.id,
        db.auth_group.role,
        db.sample_set.sample_type.with_alias('sample_type'),
        db.sample_set.id.count(distinct=True).with_alias('num_sets'),
        db.sample_set_membership.sequence_file_id.count(distinct=True).with_alias('num_samples'),
        group_statuses,
    ]

    patient_query = (query &
                    (db.patient.sample_set_id == db.auth_permission.record_id))

    queries['patient'] = db(patient_query).select(
        group_fuses['patient'],
        *select,
        left=left,
        groupby=(db.auth_group.role, db.sample_set.sample_type)
    )

    run_query = (query &
                (db.run.sample_set_id == db.auth_permission.record_id))

    queries['run'] = db(run_query).select(
        group_fuses['run'],
        *select,
        left=left,
        groupby=(db.auth_group.role, db.sample_set.sample_type)
    )

    generic_query = (query &
                (db.generic.sample_set_id == db.auth_permission.record_id))

    queries['set'] = db(generic_query).select(
        group_fuses['set'],
        *select,
        left=left,
        groupby=(db.auth_group.role, db.sample_set.sample_type)
    )

    for key in queries:
        query = queries[key]
        for r in query:
            result[r.auth_group.role][key]['count']['num_sets'] += r.num_sets
            result[r.auth_group.role][key]['count']['num_samples'] += r.num_sets
            result[r.auth_group.role][key]['count']['sample_type'] = r.sample_type
            result[r.auth_group.role][key]['statuses'] += "" if r._extra[group_statuses] is None else "".join([s.split(';')[1][0] for s in r._extra[group_statuses].split(',')])

            fuses = [] if r._extra[group_fuses[key]] is None else [fuse.split(';') for fuse in r._extra[group_fuses[key]].split(',')]
            result[r.auth_group.role]['fuses'] += (fuses)



    tags = get_tags(group_list)
    for r in tags:
        result[r.auth_group.role]['tags'] = [] if r._extra[group_tags()] is None else r._extra[group_tags()].split(',')

    involved_group_ids = get_involved_groups()

    log.debug("my account list (%.3fs)" % (time.time()-start))
    return dict(result=result,
                group_ids = group_list,
                involved_group_ids = involved_group_ids)
