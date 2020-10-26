# coding: utf8

from datetime import datetime, timedelta

if request.env.http_origin:
    response.headers['Access-Control-Allow-Origin'] = request.env.http_origin
    response.headers['Access-Control-Allow-Credentials'] = 'true'
    response.headers['Access-Control-Max-Age'] = 86400

ACCESS_DENIED = "access denied"

def index():
    group_list = auth.get_user_groups() + auth.get_user_group_parents()

    two_days_ago = datetime.today() - timedelta(days=2)

    left = [
        db.sample_set_membership.on(
            db.sample_set_membership.sample_set_id == db.sample_set.id),
        db.results_file.on(
            db.sample_set_membership.sequence_file_id == db.results_file.sequence_file_id),
        db.scheduler_run.on(
            (db.scheduler_run.task_id == db.results_file.scheduler_task_id) &
            (db.scheduler_run.start_time >= two_days_ago)),
        db.fused_file.on(
            (db.fused_file.sample_set_id == db.sample_set.id) &
            (db.fused_file.fuse_date >= two_days_ago)),
        db.config.on(
            db.config.id == db.fused_file.config_id)
    ]

    group_statuses = "GROUP_CONCAT(scheduler_run.status)"
    group_fuses = "GROUP_CONCAT(config.name || ';' || fused_file.sample_set_id || ';' || fused_file.config_id)"

    log.debug(
        db(
            db.auth_permission.group_id.belongs(group_list) &
            (db.auth_permission.table_name == 'sample_set') &
            (db.sample_set.id == db.auth_permission.record_id) &
            (db.auth_group.id == db.auth_permission.group_id)
        )._select(
            db.auth_group.role,
            db.sample_set.sample_type.with_alias('sample_type'),
            db.sample_set.id.count(distinct=True).with_alias('num_sets'),
            db.sample_set_membership.sequence_file_id.count(distinct=True).with_alias('num_samples'),
            group_statuses,
            group_fuses,
            left=left,
            groupby=(db.auth_group.role, db.sample_set.sample_type)
        )
    )

    query = db(
        db.auth_permission.group_id.belongs(group_list) &
        (db.auth_permission.table_name == 'sample_set') &
        (db.sample_set.id == db.auth_permission.record_id) &
        (db.auth_group.id == db.auth_permission.group_id)
    ).select(
        db.auth_group.role,
        db.sample_set.sample_type.with_alias('sample_type'),
        db.sample_set.id.count(distinct=True).with_alias('num_sets'),
        db.sample_set_membership.sequence_file_id.count(distinct=True).with_alias('num_samples'),
        group_statuses,
        group_fuses,
        left=left,
        groupby=(db.auth_group.role, db.sample_set.sample_type)
    )

    result = {}
    for r in query:
        if r.auth_group.role in result:
            result[r.auth_group.role].append(r)
        else:
            result[r.auth_group.role] = [r]
        r['statuses'] = "" if r._extra[group_statuses] is None else "".join([s[0] for s in r._extra[group_statuses].split(',')])

        r['fuses'] = [] if r._extra[group_fuses] is None else [fuse.split(';') for fuse in r._extra[group_fuses].split(',')]
    return dict(result=result)
