from gluon.tools import Auth
from pydal.objects import Row, Set, Query
from enum import Enum

class PermissionEnum(Enum):
    admin = 'admin'
    read = 'read'
    access = 'access'
    upload = 'upload'
    create = 'create'
    run = 'run'
    admin_config = 'admin'
    read_config = 'read'
    admin_group = 'admin'
    read_group = 'read'
    anon = 'anon'

class VidjilAuth(Auth):
    admin = None
    groups = None
    permissions = {}

    def __init__(self, environment=None, db=None):
        super(VidjilAuth, self).__init__(environment, db)

    def preload(self):
        self.groups = self.get_group_names()
        self.admin = 'admin' in self.groups

    def get_group_names(self):
        '''
        Return a list of group names.

        It is inspired from the code of Auth::groups
        '''
        result_groups = []
        if self.user is not None:
            memberships = self.db(
                self.table_membership().user_id == self.user.id).select()
            for member in memberships:
                groups = self.db(self.table_group().id == member.group_id).select()
                if groups and len(groups) > 0:
                    result_groups.append(groups[0].role)
        return result_groups

    def get_cache_key(self, action, object_of_action):
        return action +  '/' + object_of_action

    def get_user_access_groups(self, object_of_action, oid, user):
        membership = self.table_membership()
        permission = self.table_permission()

        groups = db(
                (permission.record_id == oid) &
                (permission.name == PermissionEnum.access.value) &
                (permission.table_name == object_of_action) &
                ((membership.group_id == permission.group_id) |
                ((membership.group_id == db.group_assoc.second_group_id) &
                (db.group_assoc.first_group_id == permission.group_id))) &
                (membership.user_id == user)
            ).select(membership.group_id)

        group_list = [g.group_id for g in groups]

        return list(set(group_list))

    def get_group_access_groups(self, object_of_action, oid, group):
        permission = self.table_permission()

        groups = db(
                (permission.record_id == oid) &
                (permission.name == PermissionEnum.access.value) &
                (permission.table_name == object_of_action) &
                ((group == permission.group_id) |
                ((group == db.group_assoc.second_group_id) &
                (db.group_assoc.first_group_id == permission.group_id)))
            ).select(permission.group_id)

        group_list = [g.group_id for g in groups]

        return list(set(group_list))

    def get_access_groups(self, object_of_action, oid, user=None, group=None):
        if user is None and group is None:
            user = auth.user_id
        if user is not None:
            return self.get_user_access_groups(object_of_action, oid, user)
        return self.get_group_access_groups(object_of_action, oid, group)

    def get_permission_groups(self, action, object_of_action, user=None):
        '''
        Returns all the groups for which a user has a given permission
        '''
        is_current_user = user == None
        if is_current_user:
            user = self.user.id

        membership = self.table_membership()
        permission = self.table_permission()

        groups = db(
                (membership.user_id == user) &
                (membership.group_id == permission.group_id) &
                (permission.record_id == 0) &
                (permission.name == action)
            ).select(membership.group_id)
        group_list = [g.group_id for g in groups]

        return list(set(group_list))

    def get_group_access(self, object_of_action, id, group):
        perm = self.has_permission(PermissionEnum.access.value, object_of_action, id, group_id = group)
        return perm

    def get_group_permission(self, action, object_of_action, id = 0, group = None):
        '''
        Returns whether the group has the permission to
        perform action on object_of_action
        '''
        if group is None:
            group = auth.user_group

        has_action = self.has_permission(action, 'sample_set', 0, group_id = group)
        if id == 0:
            return has_action
        return has_action and self.get_group_access(object_of_action, id, group)

    def get_permission(self, action, object_of_action, id = 0, user = None):
        '''
        Returns whether the current user has the permission 
        to perform the action on the object_of_action.

        The result is cached to avoid DB calls.
        '''
        key = self.get_cache_key(action, object_of_action)
        is_current_user = user == None
        if is_current_user:
            user = self.user_id

        if not key in self.permissions and is_current_user:
            self.permissions[key] = {}
        if not is_current_user or not id in self.permissions[key]:
            perm_groups = self.get_permission_groups(action, object_of_action, user)
            if id > 0:
                access_groups = self.get_access_groups(object_of_action, id, user)
                intersection = set(access_groups).intersection(perm_groups)
            else :
                intersection = perm_groups
            if not is_current_user:
                return len(intersection) > 0
            self.permissions[key][id] = len(intersection) > 0
        return self.permissions[key][id]

    def load_permissions(self, action, object_of_action):
        '''
        Loads the given permissions for the user into cache to allow for multiple calls to
        "can" while reducing the database overhead.
        '''
        key = self.get_cache_key(action, object_of_action)
        if key not in self.permissions:
            self.permissions[key] = {}

        query = db(self.vidjil_accessible_query(action, object_of_action)).select(self.db[object_of_action].ALL)
        for row in query:
            self.permissions[key][row.id] = True

        return query

    def is_admin(self, user = None):
        '''Tells if the user is an admin.  If the user is None, the current
        user is taken into account'''

        if self.admin == None:
            self.preload()

        if user == None:
            return self.admin
        return self.has_membership(user_id = user, role = 'admin')

    def is_in_group(self, group):

        '''
        Tells if the current user is in the group
        '''
        if self.groups == None:
            self.preload()
        return group in self.groups

    def can_create_patient(self, user = None):
        '''
        Returns True if the user can create new patients.

        If the user is None, the current user is taken into account
        '''
        return self.get_permission(PermissionEnum.create.value, 'sample_set', user = user)\
            or self.is_admin(user)

    def can_modify_patient(self, patient_id, user = None):
        '''
        Returns True iff the current user can administrate
        the patient whose ID is patient_id

        If the user is None, the current user is taken into account
        '''

        return self.get_permission(PermissionEnum.admin.value, 'patient', patient_id, user=user)\
            or self.is_admin(user)
        
    def can_modify_run(self, run_id, user = None):
        '''
        Returns True if the current user can administrate
        the run whose ID is run_id

        If the user is None, the current user is taken into account
        '''
        return self.get_permission(PermissionEnum.admin.value, 'run', run_id, user=user)\
            or self.is_admin(user)
        
    def can_modify_sample_set(self, sample_set_id, user = None) :
        sample_set = db.sample_set[sample_set_id]
        
        perm = self.get_permission(PermissionEnum.admin.value, 'sample_set', sample_set_id, user)\
            or self.is_admin(user)

        if (sample_set.sample_type == "patient") :
            for row in db( db.patient.sample_set_id == sample_set_id ).select() :
                if self.can_modify_patient(row.id, user):
                    perm = True;

        if (sample_set.sample_type == "run") :
            for row in db( db.run.sample_set_id == sample_set_id ).select() :
                if self.can_modify_run(row.id, user):
                    perm = True;

        return perm
    
    def can_modify_file(self, file_id, user = None) :
        
        if self.is_admin(user) :
            return True
        
        sample_set_list = db(db.sample_set_membership.sequence_file_id == file_id).select(db.sample_set_membership.sample_set_id)
        
        for row in sample_set_list : 
            if self.can_modify_sample_set(row.sample_set_id, user=user) :
                return True
            
        return False

    def can_modify_config(self, config_id, user = None):
        '''
        Returns True iff the current user can administrate
        the config whose ID is config_id

        If the user is None, the current user is taken into account
        '''
        return self.get_permission(PermissionEnum.admin_config.value, 'config', config_id, user)\
            or self.is_admin(user)

    def can_modify_group(self, group_id, user = None):
        '''
        Returns True iff the user can administrate the given group

        If the user is None, the current user is taken into account
        '''
        return self.get_permission(PermissionEnum.admin_group.value, 'auth_group', group_id, user = user)\
            or self.is_admin(user)

    def can_process_file(self, user = None):
        '''
        Returns True if the current user can process results

        If the user is None, the current user is taken into account
        '''
        return self.get_permission(PermissionEnum.run.value, object_of_action, id, user=user)\
            or self.is_admin(user)

    def can_upload_file(self, user = None):
        '''
        Returns True iff the current user can upload a sequence file

        If the user is None, the current user is taken into account
        '''
        return self.get_permission(PermissionEnum.upload.value, object_of_action, id, user=user)\
            or self.is_admin(user)

    def can_use_config(self, config_id, user = None):
        '''
        Returns True iff the current user can view
        the config whose ID is config_id

        If the user is None, the current user is taken into account
        '''
        return self.get_permission(PermissionEnum.read_config.value, 'config', config_id, user)\
            or self.can_modify_config(config_id, user)\
            or self.is_admin(user)

    def can_view_patient(self, patient_id, user = None):
        '''
        Returns True iff the current user can view
        the patient whose ID is patient_id

        If the user is None, the current user is taken into account
        '''
        return self.get_permission(PermissionEnum.read.value, 'patient', patient_id ,user)\
            or self.can_modify_patient(patient_id, user)\
            or self.is_admin(user)
            
    def can_view_run(self, run_id, user = None):
        '''
        Returns True iff the current user can view
        the patient whose ID is patient_id

        If the user is None, the current user is taken into account
        '''
        return self.get_permission(PermissionEnum.read.value, 'run', run_id ,user)\
            or self.can_modify_run(run_id, user)\
            or self.is_admin(user)
            
    def can_view_sample_set(self, sample_set_id, user = None) :
        sample_set = db.sample_set[sample_set_id]
        
        perm = self.get_permission(PermissionEnum.admin.value, 'sample_set', sample_set_id, user)\
            or self.is_admin(user)

        if (sample_set.sample_type == "patient") :
            for row in db( db.patient.sample_set_id == sample_set_id ).select() :
                if self.can_view_patient(row.id, user):
                    perm = True;

        if (sample_set.sample_type == "run") :
            for row in db( db.run.sample_set_id == sample_set_id ).select() :
                if self.can_view_run(row.id, user):
                    perm = True;

        return perm
        
    def can_view_patient_info(self, patient_id, user = None):
        '''
        Returns True iff the current user can see the personal information
        of the patient whose ID is given in parameter.

        If the user is None, the current user is taken into account
        '''
        return self.get_permission(PermissionEnum.anon.value, 'patient', patient_id, user)

    def get_group_parent(self, group_id):
        parent_group_list = db(
                    (db.group_assoc.second_group_id == group_id)
                ).select(db.group_assoc.ALL)

        group_list = list()

        for group_assoc in parent_group_list:
            group_list.append(group_assoc.first_group_id)

        return group_list

    def get_user_groups(self, user = None):
        is_current_user = user == None
        if is_current_user:
            user = self.user_id
        group_list = db(
                (db.auth_membership.user_id == user) &
                ((db.auth_membership.group_id == db.auth_group.id) |
                ((db.auth_membership.group_id == db.group_assoc.second_group_id) &
                (db.group_assoc.first_group_id == db.auth_group.id)))
                ).select(db.auth_group.id, db.auth_group.role, groupby=db.auth_group.id)


        return group_list

    def vidjil_accessible_query(self, name, table, user_id=None):
        """
        Returns a query with all accessible records for user_id or
        the current logged in user
        this method does not work on GAE because uses JOIN and IN

        This is an adaptation of accessible_query that better fits
        the current auth system with group associations

        Example:
            Use as::

                db(auth.accessible_query('read', db.mytable)).select(db.mytable.ALL)

        """
        if not user_id:
            user_id = self.user_id
        db = self.db
        if isinstance(table, str) and table in self.db.tables():
            table = self.db[table]
        elif isinstance(table, (Set, Query)):
            # experimental: build a chained query for all tables
            if isinstance(table, Set):
                cquery = table.query
            else:
                cquery = table
            tablenames = db._adapter.tables(cquery)
            for tablename in tablenames:
                cquery &= self.vidjil_accessible_query(name, tablename,
                                                user_id=user_id)
            return cquery
        if not isinstance(table, str) and\
                self.has_permission(name, table, 0, user_id):
            return table.id > 0
        membership = self.table_membership()
        permission = self.table_permission()
        perm_groups = self.get_permission_groups(name, table, user_id)
        query = table.id.belongs(
            db(membership.user_id == user_id)
                (membership.group_id.belongs(perm_groups))
                ((membership.group_id == permission.group_id) |
                ((membership.group_id == db.group_assoc.second_group_id) &
                (db.group_assoc.first_group_id == permission.group_id)))
                (permission.name == PermissionEnum.access.value)
                (permission.table_name == table)
                ._select(permission.record_id))
        if self.settings.everybody_group_id:
            query |= table.id.belongs(
                db(permission.group_id == self.settings.everybody_group_id)
                    (permission.name == name)
                    (permission.table_name == table)
                    ._select(permission.record_id))
        return query
