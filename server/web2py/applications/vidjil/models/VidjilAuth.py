from gluon.tools import Auth
from pydal.objects import Row, Set, Query

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

    def exists_permission(self, action, object_of_action, id, user=None):
        groups = db(db.auth_membership.user_id == user).select(db.auth_membership.group_id, db.group_assoc.first_group_id,
                left=db.group_assoc.on(db.auth_membership.group_id == db.group_assoc.second_group_id)  )
        for group in groups:
            result = self.has_permission(action, object_of_action, id, group_id = group.auth_membership.group_id)
            if group.group_assoc.first_group_id:
                result = result or self.has_permission(action, object_of_action, id, group_id = group.group_assoc.first_group_id)
            if result == True:
                return True
        return False

    def get_permission(self, action, object_of_action, id = 0, user = None, group = None):
        '''
        Returns whether the current user has the permission 
        to perform the action on the object_of_action.

        The result is cached to avoid DB calls.
        '''
        key = action + '/' + object_of_action
        is_current_user = user == None
        if is_current_user:
            user = self.user_id

        if not key in self.permissions and is_current_user:
            self.permissions[key] = {}
        if not is_current_user or not id in self.permissions[key]:
            result = self.exists_permission(action, object_of_action, id, user)
            if not is_current_user:
                return result
            self.permissions[key][id] = result
        return self.permissions[key][id]

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
        return self.get_permission('create', 'sample_set', user = user)\
            or self.is_admin(user)

    def can_modify(self, user = None):
        '''
        Returns True if the user can modify patients associated to their group
        or an affiliated group

        If the user is None, the current user is taken into account
        '''
        return self.get_permission('admin', 'sample_set', user = user)\
            or self.is_admin(user)

    def can_modify_patient(self, patient_id, user = None):
        '''
        Returns True iff the current user can administrate
        the patient whose ID is patient_id

        If the user is None, the current user is taken into account
        '''

        return (self.get_permission('admin', 'sample_set', user)\
            and self.get_permission('read', 'patient', patient_id, user))\
            or self.is_admin(user)
        
    def can_modify_run(self, run_id, user = None):
        '''
        Returns True if the current user can administrate
        the run whose ID is run_id

        If the user is None, the current user is taken into account
        '''
        return (self.get_permission('admin', 'sample_set', user)\
            and self.get_permission('read', 'run', run_id))\
            or self.is_admin(user)
        
    def can_modify_sample_set(self, sample_set_id, user = None) :
        sample_set = db.sample_set[sample_set_id]
        
        perm = (self.get_permission('admin', 'sample_set', user)\
            and self.get_permission('read', 'sample_set', sample_set_id, user))\
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
            if self.can_modify_sample_set(row.sample_set_id) :
                return True
            
        return False

    def can_modify_config(self, config_id, user = None):
        '''
        Returns True iff the current user can administrate
        the config whose ID is config_id

        If the user is None, the current user is taken into account
        '''
        return self.get_permission('admin', 'config', config_id, user)\
            or self.is_admin(user)

    def can_modify_group(self, group_id, user = None):
        '''
        Returns True iff the user can administrate the given group

        If the user is None, the current user is taken into account
        '''
        return self.get_permission('admin', 'auth_group', user = user)\
            or self.is_admin(user)

    def can_process_file(self, user = None):
        '''
        Returns True if the current user can process results

        If the user is None, the current user is taken into account
        '''
        return self.get_permission('run', 'results_file', user=user)\
            or self.is_admin(user)

    def can_upload_file(self, user = None):
        '''
        Returns True iff the current user can upload a sequence file

        If the user is None, the current user is taken into account
        '''
        return self.get_permission('upload', 'sequence_file', user=user)\
            or self.is_admin(user)

    def can_use_config(self, config_id, user = None):
        '''
        Returns True iff the current user can view
        the config whose ID is config_id

        If the user is None, the current user is taken into account
        '''
        return self.get_permission('read', 'config', config_id, user)\
            or self.can_modify_config(config_id, user)\
            or self.is_admin(user)

    def can_view_patient(self, patient_id, user = None):
        '''
        Returns True iff the current user can view
        the patient whose ID is patient_id

        If the user is None, the current user is taken into account
        '''
        return self.get_permission('read', 'patient', patient_id ,user)\
            or self.can_modify_patient(patient_id, user)\
            or self.is_admin(user)
            
    def can_view_run(self, run_id, user = None):
        '''
        Returns True iff the current user can view
        the patient whose ID is patient_id

        If the user is None, the current user is taken into account
        '''
        return self.get_permission('read', 'run', run_id ,user)\
            or self.can_modify_run(run_id, user)\
            or self.is_admin(user)
            
    def can_view_sample_set(self, sample_set_id, user = None) :
        sample_set = db.sample_set[sample_set_id]
        
        perm = self.get_permission('admin', 'sample_set', sample_set_id, user)\
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
        return self.get_permission('anon', 'sample_set', user=user)\
                and self.get_permission('read', 'patient', patient_id, user)

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

    def add_read_permission(self, group_id, table_name, record_id):
        self.add_permission(group_id, 'read', table_name, record_id)

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
                cquery &= self.accessible_query(name, tablename,
                                                user_id=user_id)
            return cquery
        if not isinstance(table, str) and\
                self.has_permission(name, table, 0, user_id):
            return table.id > 0
        membership = self.table_membership()
        permission = self.table_permission()
        query = table.id.belongs(
            db(membership.user_id == user_id)
                ((membership.group_id == permission.group_id) |
                ((membership.group_id == db.group_assoc.second_group_id) &
                (db.group_assoc.first_group_id == permission.group_id)))
                (permission.name == name)
                (permission.table_name == table)
                ._select(permission.record_id))
        if self.settings.everybody_group_id:
            query |= table.id.belongs(
                db(permission.group_id == self.settings.everybody_group_id)
                    (permission.name == name)
                    (permission.table_name == table)
                    ._select(permission.record_id))
        return query
