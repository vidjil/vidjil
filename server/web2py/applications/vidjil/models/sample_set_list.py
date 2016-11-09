class SampleSetList():
    def __init__(self, type):
        print type
        query_gss = db(
            (auth.vidjil_accessible_query(PermissionEnum.read.value, db.sample_set)) &
            (db.sample_set.sample_type == type)
        ).select(
            db.sample_set.ALL,
            orderby = ~db.sample_set.id
        )

        auth.load_permissions(PermissionEnum.admin.value, 'sample_set')
        self.sample_sets = {}
        factory = ModelFactory()
        for row in query_gss:
            self.sample_sets[row.id] = factory.get_instance(type, data=row)
        self.sample_set_ids = self.sample_sets.keys()

    def load_creator_names(self):
        query_creator = db(
            (db.sample_set.creator == db.auth_user.id)
            & (db.sample_set.id.belongs(self.sample_set_ids))
        ).select(
            db.sample_set.id, db.auth_user.last_name
        )
        for i, row in enumerate(query_creator) :
            self.sample_sets[row.sample_set.id].creator = row.auth_user.last_name

    def load_sample_information(self):
        query_sample = db(
            (db.sample_set_membership.sample_set_id == db.sample_set.id)
            &(db.sequence_file.id == db.sample_set_membership.sequence_file_id)
            &(db.sample_set.id.belongs(self.sample_set_ids))
        ).select(
            db.sample_set.id, db.sequence_file.size_file
        )

        for i, row in enumerate(query_sample) :
            self.sample_sets[row.sample_set.id].file_count += 1
            self.sample_sets[row.sample_set.id].size += row.sequence_file.size_file

    def load_config_information(self):
        query = db(
            (db.sample_set.id == db.fused_file.sample_set_id) &
            (db.fused_file.config_id == db.config.id) &
            (auth.vidjil_accessible_query(PermissionEnum.read_config.value, db.config) |
                auth.vidjil_accessible_query(PermissionEnum.admin_config.value, db.config) ) &
            (db.sample_set.id.belongs(self.sample_set_ids))
        ).select(
            db.sample_set.id, db.config.name, db.config.id, db.fused_file.fused_file
        )

        for i, row in enumerate(query) :
            self.sample_sets[row.sample_set.id].conf_list.append(
                    {'id': row.config.id, 'name': row.config.name, 'fused_file': row.fused_file.fused_file})
            self.sample_sets[row.sample_set.id].conf_id_list.append(row.config.id)

        for key, row in self.sample_sets.iteritems():
            row.most_used_conf = max(set(row.conf_id_list), key=row.conf_id_list.count)

    def load_permitted_groups(self):
        query = db(
            ((db.sample_set.id == db.auth_permission.record_id) | (db.auth_permission.record_id == 0)) &
            (db.auth_permission.table_name == 'sample_set') &
            (db.auth_permission.name == PermissionEnum.read.value) &
            (db.auth_group.id == db.auth_permission.group_id) &
            (db.sample_set.id.belongs(self.sample_set_ids))
        ).select(
            db.sample_set.id, db.auth_group.role
        )
        for i, row in enumerate(query) :
            self.sample_sets[row.sample_set.id].group_list.append(row.auth_group.role.replace('user_','u'))

        for key, row in self.sample_sets.iteritems():
            row.groups = ", ".join(filter(lambda g: g != 'admin', set(row.group_list)))

    def load_anon_permissions(self):
        query = db(
            (db.auth_permission.name == "anon") &
            (db.auth_permission.table_name == "sample_set") &
            (db.sample_set.id == db.auth_permission.record_id ) &
            (db.auth_group.id == db.auth_permission.group_id ) &
            (db.auth_membership.user_id == auth.user_id) &
            (db.auth_membership.group_id == db.auth_group.id) &
            (db.sample_set.id.belongs(self.sample_set_ids))
        ).select(
            db.sample_set.id
        )
        for i, row in enumerate(query) :
            self.sample_sets[row.id].anon_allowed = True

    def get_values(self):
        return self.sample_sets.values()
