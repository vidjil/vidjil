from enum import Enum

class PermissionEnum(Enum):
    admin = 'admin'
    read = 'read'
    access = 'access'
    upload = 'upload'
    create = 'create'
    run = 'run'
    save = 'save'
    admin_config = 'admin'
    read_config = 'read'
    create_config = 'create_config'
    admin_group = 'admin'
    read_group = 'read'
    create_group = 'create'
    admin_pre_process = 'admin'
    read_pre_process = 'read'
    create_pre_process = 'create'
    anon = 'anon'

