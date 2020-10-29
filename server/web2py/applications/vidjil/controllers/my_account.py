# coding: utf8

from datetime import datetime, timedelta
import time
import types

if request.env.http_origin:
    response.headers['Access-Control-Allow-Origin'] = request.env.http_origin
    response.headers['Access-Control-Allow-Credentials'] = 'true'
    response.headers['Access-Control-Max-Age'] = 86400

ACCESS_DENIED = "access denied"

def index():
    start = time.time()

    if auth.is_admin() and 'group_ids' in request.vars and request.vars['group_ids'] is not None:
        group_list = request.vars['group_ids']
        if isinstance(group_list, types.StringTypes):
            group_list = [group_list]
    else:
        group_list = [int(g.id) for g in auth.get_user_groups() + auth.get_user_group_parents()]

    involved_group_ids = get_involved_groups()

    if "filter" not in request.vars :
        request.vars["filter"] = ""


    search, tags = parse_search(request.vars["filter"])

    left = [
        db.sample_set.on(
            db.sample_set.id == db.auth_permission.record_id),
        db.sample_set_membership.on(
            db.sample_set_membership.sample_set_id == db.sample_set.id)
    ]

    base_query = (
        db.auth_group.id.belongs(group_list) &
        (db.auth_permission.group_id == db.auth_group.id) &
        (db.auth_permission.table_name == 'sample_set')
    )

    group_permissions = "GROUP_CONCAT(DISTINCT auth_permission.name)"

    perm_query = db(base_query &
            (db.auth_permission.record_id == 0)
        ).select(
            db.auth_group.role,
            group_permissions,
            groupby=db.auth_group.role
        )

    result = {}
    for r in perm_query:
        if(r.auth_group.role not in result):
            result[r.auth_group.role] = {'count': []}
            result[r.auth_group.role]['statuses'] = ""
            result[r.auth_group.role]['fuses'] = []
            result[r.auth_group.role]['tags'] = []
        result[r.auth_group.role]['permissions'] = [] if r._extra[group_permissions] is None else r._extra[group_permissions]

    if (tags is not None and len(tags) > 0):
        base_query = (base_query &
            (db.tag.name.upper().belongs([t.upper() for t in tags])) &
            (db.tag_ref.tag_id == db.tag.id) &
            (db.tag_ref.table_name == 'sequence_file') &
            (db.tag_ref.record_id == db.sample_set_membership.sequence_file_id)
        )

    query = db(base_query).select(
        db.auth_group.id,
        db.auth_group.role,
        db.sample_set.sample_type.with_alias('sample_type'),
        db.sample_set.id.count(distinct=True).with_alias('num_sets'),
        db.sample_set_membership.sequence_file_id.count(distinct=True).with_alias('num_samples'),
        left=left,
        groupby=(db.auth_group.role, db.sample_set.sample_type)
    )

    for r in query:
        if r.auth_group.role in result:
            result[r.auth_group.role]['count'].append(r)
        else:
            result[r.auth_group.role] = {'count': [r]}

    two_days_ago = datetime.today() - timedelta(days=2)

    group_statuses = "GROUP_CONCAT(DISTINCT scheduler_task.id || ';' || scheduler_task.status)"
    group_fuses = "GROUP_CONCAT(DISTINCT config.name || ';' || fused_file.sample_set_id || ';' || fused_file.config_id || ';' || sample_set.sample_type || ';' || sequence_file.filename)"
    group_tags = "GROUP_CONCAT(DISTINCT tag.name)"

    left = [
        db.sample_set.on(
            db.auth_permission.record_id == db.sample_set.id),
        db.sample_set_membership.on(
            db.sample_set_membership.sample_set_id == db.sample_set.id),
        db.sequence_file.on(
            db.sequence_file.id == db.sample_set_membership.sequence_file_id),
        db.results_file.on(
            db.sample_set_membership.sequence_file_id == db.results_file.sequence_file_id),
        db.scheduler_task.on(
            (db.scheduler_task.id == db.results_file.scheduler_task_id) &
            (db.scheduler_task.start_time >= two_days_ago)),
        db.fused_file.on(
            (db.fused_file.sample_set_id == db.sample_set.id) &
            (db.fused_file.fuse_date >= two_days_ago)),
        db.config.on(
            db.config.id == db.fused_file.config_id),
        db.tag_ref.on(
            (db.tag_ref.table_name == 'sequence_file') &
            (db.tag_ref.record_id == db.sample_set_membership.sequence_file_id)),
        db.tag.on(
            db.tag_ref.tag_id == db.tag.id)
    ]

    query = db(base_query).select(
        db.auth_group.role,
        group_statuses,
        group_fuses,
        group_tags,
        left=left,
        groupby=db.auth_group.role,
        orderby=~db.scheduler_task.id
    )

    for r in query:
        result[r.auth_group.role]['statuses'] = "" if r._extra[group_statuses] is None else "".join([s.split(';')[1][0] for s in r._extra[group_statuses].split(',')])

        result[r.auth_group.role]['fuses'] = [] if r._extra[group_fuses] is None else [fuse.split(';') for fuse in r._extra[group_fuses].split(',')]

        result[r.auth_group.role]['tags'] = [] if r._extra[group_tags] is None else r._extra[group_tags].split(',')

    log.debug("my account list (%.3fs)" % (time.time()-start))
    return dict(result=result,
                group_ids = group_list,
                involved_group_ids = involved_group_ids)
