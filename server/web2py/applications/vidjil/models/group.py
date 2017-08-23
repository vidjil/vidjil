def add_default_group_permissions(auth, group_id):
    auth.add_permission(group_id, PermissionEnum.create.value, 'sample_set', 0);
    auth.add_permission(group_id, PermissionEnum.read.value, 'sample_set', 0);
    auth.add_permission(group_id, PermissionEnum.admin.value, 'sample_set', 0);
    auth.add_permission(group_id, PermissionEnum.upload.value, 'sample_set', 0);
    auth.add_permission(group_id, PermissionEnum.save.value, 'sample_set', 0);
