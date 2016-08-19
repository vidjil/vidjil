from gluon import current

def get_default_creation_group(auth):
    db = auth.db
    max_group = auth.user_group()
    group_dict = {}
    if (auth.is_admin()):
        group_list = db(db.auth_group).select(db.auth_group.id, db.auth_group.role)
    else:
        group_list = db((db.auth_group.id == db.auth_membership.group_id) &
                        (db.auth_membership.user_id == auth.user_id) &
                        (db.auth_group.role != 'public')
                    ).select(db.auth_group.id, db.auth_group.role)
    max_elements = 0
    for group in group_list:
        if (auth.is_admin()
                or auth.has_permission(PermissionEnum.create.value, 'sample_set', 0, group_id = group.id)):
            parents = auth.get_group_parent(group.id)
            if (len(parents) > 0):
                tgt_group = parents[0]
            else:
                tgt_group = group
            group_dict[tgt_group.id] = {'id': tgt_group.id,
                    'name': 'Personnal Group' if tgt_group.id == auth.user_group() else tgt_group.role}
            elements = db(
                (db.auth_permission.group_id == tgt_group.id) &
                (db.auth_permission.table_name.belongs('patient', 'run', 'sample_set')) &
                (db.auth_permission.record_id > 0)
            ).count()
            if (elements >= max_elements and tgt_group.id != auth.user_group()):
                max_elements = elements
                max_group = tgt_group.id
    groups = [{'id': group_dict[key]['id'], 'name': group_dict[key]['name']} for key in group_dict]
    return (groups, max_group)

