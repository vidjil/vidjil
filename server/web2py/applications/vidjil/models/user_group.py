def get_group_list(auth):
    if (auth.is_admin()):
        return db(db.auth_group).select(db.auth_group.id, db.auth_group.role)
    else:
        return db((db.auth_group.id == db.auth_membership.group_id) &
                        (db.auth_membership.user_id == auth.user_id) &
                        (db.auth_group.role != 'public')
                    ).select(db.auth_group.id, db.auth_group.role)

def get_default_creation_group(auth):
    db = auth.db
    max_group = auth.user_group()
    group_dict = {}
    max_elements = 0
    group_list = get_group_list(auth)
    for group in group_list:
        if (auth.is_admin()
                or auth.has_permission(PermissionEnum.create.value, 'sample_set', 0, group_id = group.id)):
            parents = auth.get_group_parent(group.id)
            if (len(parents) > 0):
                tgt_group = parents[0]
            else:
                tgt_group = group
            group_dict[tgt_group.id] = {'id': tgt_group.id,
                    'name': 'Personal Group' if tgt_group.id == auth.user_group() else tgt_group.role}
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

def get_upload_group_ids(auth):
    db = auth.db
    group_ids = []
    group_list = get_group_list(auth)
    for group in group_list:
        if (auth.is_admin()
                or auth.has_permission(PermissionEnum.upload.value, 'sample_set', 0, group_id = group.id)):
            parents = auth.get_group_parent(group.id)
            if (len(parents) > 0):
                group_ids.append(parents[0].id)
            else:
                group_ids.append(group.id)
    return group_ids

def get_involved_groups():
    '''
    Returns all the groups that are related to the user. This includes all groups
    that the user is a member of, as well as any of their parents
    '''
    if (auth.is_admin()):
        return [int(g.id) for g in db(db.auth_group).select(db.auth_group.id)]
    group_ids = [int(i) for i in auth.user_groups]
    parent_group_ids = [int(f.id) for f in auth.get_user_group_parents()]
    return group_ids + parent_group_ids
