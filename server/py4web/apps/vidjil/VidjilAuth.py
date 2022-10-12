#coding: utf-8
from py4web.utils.auth import Auth
from pydal.objects import Row, Rows, Table, Query, Set, Expression
from enum import Enum
from py4web.core import Fixture, Translator, Flash, REGEX_APPJSON

from .modules.permission_enum import PermissionEnum
from . import defs, settings

class PermissionLetterMapping(Enum):
    admin = 'e'
    create = 'c'
    upload = 'u'
    run = 'r'
    anon = 'a'
    save = 's'

class VidjilAuth(Auth):
    admin = None
    groups = None
    permissions = {}

    def __init__(self, session, db, define_tables):
        self.log = None
        self.flash = Flash()
        super(VidjilAuth, self).__init__(session, db, define_tables)

    # TODO
    def is_impersonating(self):
        return False

    def preload(self):
        self.groups = self.get_group_names()
        self.admin = 'admin' in self.groups

    def exists(self, object_of_action, object_id):
        db = self.db
        if (object_of_action in self.permissions \
            and object_id in self.permissions[object_of_action]):
            return True
        return object_id and db[object_of_action][object_id] is not None

    def get_group_names(self):
        '''
        Return a list of group names.

        It is inspired from the code of Auth::groups
        '''
        result_groups = []
        if self.user is not None:
            memberships = self.db(
                self.table_membership().user_id == self.get_user().get('id')).select(self.table_membership().group_id)
            membership_group_ids = [x.group_id for x in memberships]
            groups = self.db(self.table_group().id.belongs(membership_group_ids)).select()
            for group in groups:
                result_groups.append(group.role)
        return result_groups

    def get_user_access_groups(self, object_of_action, oid, user):
        db = self.db
        membership = db.auth_membership
        permission = db.auth_permission

        groups = db(
                (permission.record_id == oid) &
                (permission.name == PermissionEnum.access.value) &
                (permission.table_name == object_of_action) &
                (membership.group_id == permission.group_id) &
                (membership.user_id == user)
            ).select(membership.group_id)

        parent_groups = db(
                (permission.record_id == oid) &
                (permission.name == PermissionEnum.access.value) &
                (permission.table_name == object_of_action) &
                (membership.group_id == db.group_assoc.second_group_id) &
                (db.group_assoc.first_group_id == permission.group_id) &
                (membership.user_id == user)
            ).select(membership.group_id)

        group_list = [g.group_id for g in groups]
        parent_list = [g.group_id for g in parent_groups]

        final_list = group_list + parent_list

        return list(set(final_list))

    def get_group_access_groups(self, object_of_action, oid, group):
        permission = self.table_permission()
        db = self.db
        groups = db(
                (permission.record_id == oid) &
                (permission.name == PermissionEnum.access.value) &
                (permission.table_name == object_of_action) &
                (group == permission.group_id)
            ).select(permission.group_id)

        parent_groups = db(
                (permission.record_id == oid) &
                (permission.name == PermissionEnum.access.value) &
                (permission.table_name == object_of_action) &
                (group == db.group_assoc.second_group_id) &
                (db.group_assoc.first_group_id == permission.group_id)
            ).select(permission.group_id)

        group_list = [g.group_id for g in groups]
        parent_list = [g.group_id for g in parent_groups]

        final_list = group_list + parent_list

        return list(set(final_list))

    def get_access_groups(self, object_of_action, oid, user=None, group=None):
        if user is None and group is None:
            user = self.user_id
        if user is not None:
            return self.get_user_access_groups(object_of_action, oid, user)
        return self.get_group_access_groups(object_of_action, oid, group)

    def get_permission_groups(self, action, user=None):
        '''
        Returns all the groups for which a user has a given permission
        '''
        is_current_user = user == None
        if is_current_user:
            user = self.session.get("user")

        db = self.db

        membership = db.auth_membership
        permission = db.auth_permission

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

    def get_group_permissions(self, table_name, group_id, record_id=0, myfilter=[]):
        db = self.db
        q = ((db.auth_permission.table_name == table_name)&
            (db.auth_permission.group_id == group_id)&
            (db.auth_permission.record_id == record_id))
        if myfilter:
            q &= (db.auth_permission.name.belongs(myfilter))
        perms = db(q).select(db.auth_permission.name, orderby=db.auth_permission.name)
        return [p.name for p in perms]

    def get_group_permission(self, action, object_of_action, id = 0, group = None):
        '''
        Returns whether the group has the permission to
        perform action on object_of_action
        '''
        if group is None:
            group = self.user_group

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
        is_current_user = (user == None) or (user == self.user_id)
        if is_current_user:
            user = self.user_id

        missing_value = False
        if is_current_user:
            if not object_of_action in self.permissions:
                self.permissions[object_of_action] = {}
            if not id in self.permissions[object_of_action]:
                self.permissions[object_of_action][id] = {}
                missing_value = True
            if not action in self.permissions[object_of_action][id]:
                missing_value = True
        if not is_current_user or missing_value:
            perm_groups = self.get_permission_groups(action, user)
            if id > 0:
                access_groups = self.get_access_groups(object_of_action, id, user)
                intersection = set(access_groups).intersection(perm_groups)
            else :
                intersection = perm_groups
            if not is_current_user:
                return len(intersection) > 0
            self.permissions[object_of_action][id][action] = len(intersection) > 0
        return self.permissions[object_of_action][id][action]

    def load_permissions(self, action, object_of_action):
        '''
        Loads the given permissions for the user into cache to allow for multiple calls to
        "can" while reducing the database overhead.
        '''
        db = self.db
        if object_of_action not in self.permissions:
            self.permissions[object_of_action] = {}

        query = db(self.vidjil_accessible_query(PermissionEnum.read.value, object_of_action)).select(self.db[object_of_action].id)
        for row in query:
            if row.id not in self.permissions[object_of_action]:
                self.permissions[object_of_action][row.id] = {}
            self.permissions[object_of_action][row.id][action] = False

        query = db(self.vidjil_accessible_query(action, object_of_action)).select(self.db[object_of_action].id)
        for row in query:
            if row.id not in self.permissions[object_of_action]:
                self.permissions[object_of_action][row.id] = {}
            self.permissions[object_of_action][row.id][action] = True

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

    def can_create_config(self, user = None):
        '''
        Returns True is the user can create new configs.

        If the user is None, the current user is taken into account
        '''
        return self.get_permission(PermissionEnum.create_config.value, 'config', user = user)\
            or self.is_admin(user)

    def can_create_pre_process(self, user = None):
        '''
        Returns True is the user can create new pre_processes.

        If the user is None, the current user is taken into account
        '''
        return self.get_permission(PermissionEnum.create_pre_process.value, 'pre_process', user = user)\
            or self.is_admin(user)

    def can_modify_patient(self, patient_id, user = None):
        '''
        Returns True iff the current user can administrate
        the patient whose ID is patient_id

        If the user is None, the current user is taken into account
        '''
        exists = self.exists('patient', patient_id)
        return exists\
            and (self.get_permission(PermissionEnum.admin.value, 'patient', patient_id, user=user)\
            or self.is_admin(user))
        
    def can_modify_run(self, run_id, user = None):
        '''
        Returns True if the current user can administrate
        the run whose ID is run_id

        If the user is None, the current user is taken into account
        '''
        exists = self.exists('run', run_id)
        return exists\
            and (self.get_permission(PermissionEnum.admin.value, 'run', run_id, user=user)\
            or self.is_admin(user))
        
    def can_modify_subset(self, type, subset_id, user = None) :
        exists = self.exists(type, subset_id)
        return exists\
            and (self.get_permission(PermissionEnum.admin.value, type, subset_id, user=user)\
            or self.is_admin(user))

    def can_modify_sample_set(self, sample_set_id, user = None) :
        db = self.db

        sample_set = db.sample_set[sample_set_id]
        if sample_set is None:
            return False
        
        sample_type = sample_set.sample_type
        perm = self.get_permission(PermissionEnum.admin.value, 'sample_set', sample_set_id, user)\
            or self.is_admin(user)
        if perm:
            return True

        for row in db( db[sample_type].sample_set_id == sample_set_id ).select() :
            if self.can_modify(sample_type, row.id, user):
                perm = True;

        return perm

    def can_modify_pre_process(self, pre_process_id, user = None):
        '''
        Returns True if the current user can administrate
        the pre_process whose ID is pre_process_id
        If the pre_process does not exists, returns False

        If the user is None, the current user is taken into account
        '''
        exists = self.exists('pre_process', pre_process_id)
        return exists\
            and (self.get_permission(PermissionEnum.admin_pre_process.value, 'pre_process', pre_process_id, user)\
            or self.is_admin(user))

    def can_modify_user(self, id):
        '''
        Returns True if the current user can modify the user
        whose ID is given as parameter

        :param: id should be an integer
        '''
        return self.is_admin() or\
            ((self.user_id == id) and (not hasattr(defs, 'LIMITED_ACCOUNTS') or self.user_id not in defs.LIMITED_ACCOUNTS))

    def can_modify(self, object_of_action, id, user = None):
        '''
        Returns True if the user can modify the object of action whose ID id id
        '''
        exists = self.exists(object_of_action, id)
        return exists\
            and (self.get_permission(PermissionEnum.admin.value, object_of_action, id, user)\
            or self.is_admin(user))

    def can_view(self, object_of_action, id, user = None):
        '''
        Returns True if the user can view the object of action whose ID is id
        '''
        exists = self.exists(object_of_action, id)
        return exists\
            and (self.get_permission(PermissionEnum.read.value, object_of_action, id, user)\
            or self.can_modify(object_of_action, id, user)\
            or self.is_admin(user))

    def can_modify_file(self, file_id, user = None) :
        db = self.db

        if not self.exists('sequence_file', file_id):
            return False

        if self.is_admin(user) :
            return True
        
        sample_set_list = db(
                (db.sample_set_membership.sequence_file_id == file_id) &
                (db.sample_set.id == db.sample_set_membership.sample_set_id)
            ).select(db.sample_set.id)
        
        for row in sample_set_list : 
            if self.can_modify_sample_set(row.id, user=user) :
                return True
            
        return False

    def can_modify_config(self, config_id, user = None):
        '''
        Returns True iff the current user can administrate
        the config whose ID is config_id

        If the user is None, the current user is taken into account
        '''
        exists = self.exists('config', config_id)
        return exists\
            and (self.get_permission(PermissionEnum.admin_config.value, 'config', config_id, user)\
            or self.is_admin(user))

    def can_modify_group(self, group_id, user = None):
        '''
        Returns True iff the user can administrate the given group

        If the user is None, the current user is taken into account
        '''
        exists = self.exists('auth_group', group_id)
        return exists\
            and (self.get_permission(PermissionEnum.admin_group.value, 'auth_group', group_id, user = user)\
            or self.is_admin(user))

    def can_process_file(self, object_of_action, id=0, user = None):
        '''
        Returns True if the current user can process results

        If the user is None, the current user is taken into account
        '''
        exists = self.exists(object_of_action, id) if id > 0 else True
        return exists\
            and (self.get_permission(PermissionEnum.run.value, object_of_action, id, user=user)\
            or self.is_admin(user))

    def can_process_sample_set(self, id, user = None):
        '''
        Returns if the user can process results for a sample_set
        '''
        db = self.db
        sample_set = db.sample_set[id]
        if sample_set is None:
            return False

        perm = self.get_permission(PermissionEnum.run.value, 'sample_set', id, user) \
            or self.is_admin(user)

        if perm:
            return True

        query = db(db[sample_set.sample_type].sample_set_id == sample_set.id).select()
        for row in query:
            if self.can_process_file(sample_set.sample_type, row.id, user):
                return True
        return False

    def can_upload_file(self, object_of_action, id=0, user = None):
        '''
        Returns True iff the current user can upload a sequence file

        If the user is None, the current user is taken into account
        '''
        exists = self.exists(object_of_action, id) if id > 0 else True
        return exists\
            and (self.get_permission(PermissionEnum.upload.value, object_of_action, id, user=user)\
            or self.is_admin(user))

    def can_upload_sample_set(self, id, user = None):
        '''
        Returns if the user can upload files for a sample_set
        '''
        db = self.db
        sample_set = db.sample_set[id]
        if sample_set is None:
            return False

        perm = self.get_permission(PermissionEnum.upload.value, 'sample_set', id, user) \
            or self.is_admin(user)

        if perm:
            return True

        query = db(db[sample_set.sample_type].sample_set_id == sample_set.id).select()
        for row in query:
            if self.can_upload_file(sample_set.sample_type, row.id, user):
                return True
        return False

    def can_use_config(self, config_id, user = None):
        '''
        Returns True iff the current user can view
        the config whose ID is config_id

        If the user is None, the current user is taken into account
        '''
        exists = self.exists('config', config_id)
        return exists\
            and (self.get_permission(PermissionEnum.read_config.value, 'config', config_id, user)\
            or self.can_modify_config(config_id, user)\
            or self.is_admin(user))

    def can_view_sample_set(self, sample_set_id, user = None) :
        db = self.db

        perm = self.get_permission(PermissionEnum.read.value, 'sample_set', sample_set_id, user)\
            or self.is_admin(user)

        if perm:
            return perm

        sample_set = db.sample_set[sample_set_id]
        if sample_set is None:
            return False

        sample_type = sample_set.sample_type
        for row in db( db[sample_type].sample_set_id == sample_set_id ).select() :
            if self.can_view(sample_type, row.id, user):
                perm = True;

        return perm

    def can_view_group(self, group_id, user = None):
        '''
        Returns Trie if the current user can view
        the group whose ID is group_id
        '''
        return self.can_view('auth_group', group_id, user)

    def can_view_info(self, type, id, user = None):
        '''
        Return True if user can see the information contained within
        a given sample_set

        If the user is None, the current userr is taken into account
        '''
        exists = self.exists(type, id)
        return exists and self.get_permission(PermissionEnum.anon.value, type, id, user)

    def can_save_patient(self, patient_id, user = None):
        '''
        Returns True if the user can save an analysis for the given patient

        If the user is None, the current user is taken into account
        '''
        exists = self.exists('patient', patient_id)
        return exists\
            and (self.get_permission(PermissionEnum.save.value, 'patient', patient_id, user)\
            or self.is_admin(user))

    def can_save_run(self, run_id, user = None):
        '''
        Returns True if the user can save an analysis for the given run

        If the user is None, the current user is taken into account
        '''
        exists = self.exists('run', run_id)
        return exists\
            and (self.get_permission(PermissionEnum.save.value, 'run', run_id, user)\
            or self.is_admin(user))

    def can_save_sample_set(self, sample_set_id, user = None) :
        db = self.db
        sample_set = db.sample_set[sample_set_id]
        if sample_set is None:
            return False

        perm = self.get_permission(PermissionEnum.save.value, 'sample_set', sample_set_id, user)\
            or self.is_admin(user)

        if (sample_set.sample_type == "patient") :
            for row in db( db.patient.sample_set_id == sample_set_id ).select() :
                if self.can_save_patient(row.id, user):
                    perm = True;

        if (sample_set.sample_type == "run") :
            for row in db( db.run.sample_set_id == sample_set_id ).select() :
                if self.can_save_run(row.id, user):
                    perm = True;

        return perm

    def get_group_parent(self, group_id):
        db = self.db
        parent_group_list = db(
                    (db.group_assoc.second_group_id == group_id)
                ).select(db.group_assoc.ALL)

        group_list = list()

        for group_assoc in parent_group_list:
            group_list.append(group_assoc.first_group_id)

        return group_list

    def get_user_groups(self, user = None):
        db = self.db
        is_current_user = user == None
        if is_current_user:
            user = self.user_id
        group_list = db(
                (db.auth_membership.user_id == user) &
                (db.auth_membership.group_id == db.auth_group.id)
                ).select(db.auth_group.id, db.auth_group.role, groupby=db.auth_group.id)

        return group_list

    def get_user_group_parents(self, user = None):
        db = self.db
        is_current_user = user == None
        if is_current_user:
            user = self.user_id
        parent_list = db(
                (db.auth_membership.user_id == user) &
                (db.auth_membership.group_id == db.group_assoc.second_group_id) &
                (db.group_assoc.first_group_id == db.auth_group.id)
                ).select(db.auth_group.id, db.auth_group.role, groupby=db.auth_group.id)
        return parent_list

    def vidjil_accessible_query(self, name, table, user_id=None):
        """
        Returns a query with all accessible records for user_id or
        the current logged in user
        this method does not work on GAE because uses JOIN and IN

        This is an adaptation of accessible_query that better fits
        the current auth system with group associations

        :param: name: The name of the query (eg. 'read')
        :param: table: The table for accessibility
        :param: user_id: ID of the user

        Example:
            Use as::

                db(auth.vidjil_accessible_query('read', db.mytable, 1)).select(db.mytable.ALL)

        """
        if user_id == None:
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
                self.has_permission(name, table, 0, user_id) and\
                self.has_permission(PermissionEnum.access.value, table, 0, user_id):
            return table.id > 0

        if self.is_admin(user_id) :
            return table.id > 0

        membership = db.auth_membership
        permission = db.auth_permission
        perm_groups = self.get_permission_groups(name, user_id)
        accessible_ids_results = db(((membership.user_id == user_id) &
                                     (membership.group_id.belongs(perm_groups)) &
                                     (membership.group_id == permission.group_id) &
                                     (permission.name == PermissionEnum.access.value) &
                                     (permission.table_name == table))).select(permission.record_id)
        accessible_assoc_results = db(((membership.user_id == user_id) &
                                       (membership.group_id.belongs(perm_groups)) &
                                       (membership.group_id == db.group_assoc.second_group_id) &
                                       (db.group_assoc.first_group_id == permission.group_id) &
                                       (permission.name == PermissionEnum.access.value) &
                                       (permission.table_name == table))).select(permission.record_id)

        everybody_results = []

        everybody_results = db(permission.group_id == 3)\
                            (permission.name == name)\
                            (permission.table_name == table)\
                            .select(permission.record_id)

        accessible_ids = [i.record_id for i in accessible_ids_results] +\
                         [i.record_id for i in accessible_assoc_results] +\
                         [i.record_id for i in everybody_results]
        query = (table.id.belongs(accessible_ids))
        return query

    def log_event(self, description, vars=None, origin='auth'):
        super(VidjilAuth, self).log_event(description, vars, origin)
        if self.log and description:
            message = description % vars + '.'
            for (k,v) in vars.iteritems():
                if 'password' not in k:
                    message += ' %s' % v 
            if 'Logged-in' in description:
                self.log.info(message)
            else:
                self.log.debug(message)

    def add_permission(self,
                       group_id,
                       name='any',
                       table_name='',
                       record_id=0,
                       ):
        """
        Gives group_id 'name' access to 'table_name' and 'record_id'
        """

        permission = self.table_permission()
        if group_id == 0:
            group_id = self.user_group()
        record = self.db((permission.group_id == group_id) &
                         (permission.name == name) &
                         (permission.table_name == str(table_name)) &
                         (permission.record_id == record_id),
                         ignore_common_filters=True
                         ).select(limitby=(0, 1), orderby_on_limitby=False).first()
        if record:
            if hasattr(record, 'is_active') and not record.is_active:
                record.update_record(is_active=True)
            id = record.id
        else:
            id = permission.insert(group_id=group_id, name=name,
                                   table_name=str(table_name),
                                   record_id=record_id)
        return id

    def del_permission(self,
                       group_id,
                       name='any',
                       table_name='',
                       record_id=0,
                       ):
        """
        Revokes group_id 'name' access to 'table_name' and 'record_id'
        """

        permission = self.table_permission()
        self.log_event(self.messages['del_permission_log'],
                       dict(group_id=group_id, name=name,
                            table_name=table_name, record_id=record_id))
        return self.db(permission.group_id ==
                       group_id)(permission.name ==
                                 name)(permission.table_name ==
                                       str(table_name))(permission.record_id ==
                                                        record_id).delete()



    def has_permission(self,
                       name     ='any',
                       table_name='',
                       record_id=0,
                       user_id  =None,
                       group_id =None,
                       ):

        if not group_id and \
                self.has_permission(name, table_name, record_id, user_id=None,
                                    group_id=3):
                return True

        if not user_id and not group_id and self.user:
            user_id = self.get_user().get('id')

        if user_id:
            membership = self.db.auth_membership
            rows = self.db(membership.user_id == user_id).select(membership.group_id)
            groups = set([row.group_id for row in rows])
            if group_id and group_id not in groups:
                return False
        else:
            groups = set([group_id])
        permission = self.db.auth_permission
        rows = self.db(permission.name ==
                       name)(permission.table_name ==
                             str(table_name))(permission.record_id ==
                                              record_id).select(permission.group_id)
        groups_required = set([row.group_id for row in rows])

        if record_id:
            rows = self.db(permission.name ==
                           name)(permission.table_name ==
                                 str(table_name))(permission.record_id ==
                                                  0).select(permission.group_id)
            groups_required = groups_required.union(set([row.group_id for row in rows]))

        if groups.intersection(groups_required):
            r = True
        else:
            r = False

        return r

    def table_user(self):
        return self.db.auth_user

    def table_group(self):
        return self.db.auth_group

    def table_membership(self):
        return self.db.auth_membership

    def table_permission(self):
        return self.db.auth_permission

    def table_event(self):
        return self.db.auth_event

    def id_group(self, role):
        """
        Returns the group_id of the group specified by the role
        """
        rows = self.db(self.table_group().role == role).select()
        if not rows:
            return None
        return rows[0].id

    def user_group(self, user_id=None):
        """
        Returns the group_id of the group uniquely associated to this user
        i.e. `role=user:[user_id]`
        """
        return self.id_group(self.user_group_role(user_id))

    def user_group_role(self, user_id=None):
        if user_id:
            return  'user_%(id)04d' % {'id' : user_id }
        else:
            return  'user_%(id)04d' % {'id' : self.user_id }
        

    def has_membership(self, group_id=None, user_id=None, role=None, cached=False):
        if not user_id and self.user:
            user_id = self.user.id
        if cached:
            id_role = group_id or role
            r = (user_id and id_role in self.user_groups.values()) or (user_id and id_role in self.user_groups)
        else:
            group_id = group_id or self.id_group(role)
            try:
                group_id = int(group_id)
            except:
                group_id = self.id_group(group_id)  # interpret group_id as a role
            membership = self.table_membership()
            if group_id and user_id and self.db((membership.user_id == user_id) &
                                                (membership.group_id == group_id)).select():
                r = True
            else:
                r = False
                
        return r

    def __str__(self):
        return "%04d – %s %s" % (self.id, self.first_name, self.last_name)

