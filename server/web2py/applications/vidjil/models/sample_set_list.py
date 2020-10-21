class SampleSetList():
    '''
    Deals with a list of a type of sample set (either patient, run or set).

    This class is used to load all the required information for such a list.
    '''
    def __init__(self, type, page=None, step=None, tags=None):
        self.type = type
        s_table = db[type]

        left = [db.sample_set_membership.on(s_table.sample_set_id == db.sample_set_membership.sample_set_id),
                db.sequence_file.on(db.sample_set_membership.sequence_file_id == db.sequence_file.id),
                db.fused_file.on(s_table.sample_set_id == db.fused_file.sample_set_id),
                db.config.on(db.fused_file.config_id == db.config.id),
                db.auth_permission.on((db.auth_permission.table_name == 'sample_set') & (db.auth_permission.record_id == s_table.sample_set_id) & (db.auth_permission.name == PermissionEnum.access.value)),
                db.auth_group.on(db.auth_permission.group_id == db.auth_group.id),
                db.auth_membership.on(db.auth_group.id == db.auth_membership.group_id),
                db.auth_permission.with_alias('anon_permission').on(
                    (db.anon_permission.table_name == self.type) &
                    (db.anon_permission.name == "anon")  &
                    (db.anon_permission.record_id == s_table.id) &
                    (db.auth_group.id == db.anon_permission.group_id ) &
                    (db.auth_membership.user_id == auth.user_id) &
                    (db.auth_membership.group_id == db.auth_group.id))
                ]

        group_configs = get_conf_list_select()
        group_config_ids = get_config_ids_select()
        group_config_names = get_config_names_select()
        group_group_names = get_group_names_select()

        # TODO remove this hack
        if self.type == 'patient':
            dedicated_fields = [
                s_table.first_name.with_alias('first_name'),
                s_table.last_name.with_alias('last_name'),
                s_table.birth.with_alias('birth'),
            ]
            groupby = [s_table.id, s_table.sample_set_id, s_table.first_name, s_table.last_name, s_table.birth, s_table.info, db.auth_user.last_name]
        else:
            dedicated_fields = [s_table.name.with_alias('name')]
            groupby = [s_table.id, s_table.sample_set_id, s_table.name, s_table.info, db.auth_user.last_name],

        self.result = db(
            (auth.vidjil_accessible_query('read', db.sample_set)) &
            (s_table.sample_set_id == db.sample_set.id) &
            (s_table.creator == db.auth_user.id)
        ).select(
            s_table.id.with_alias('id'),
            s_table.sample_set_id.with_alias('sample_set_id'),
            s_table.info.with_alias('info'),
            db.auth_user.last_name.with_alias('creator'),
            db.sequence_file.size_file.sum().with_alias('size'),
            db.sequence_file.id.count().with_alias('file_count'),
            db.anon_permission.name.with_alias('has_permission'),
            group_configs,
            group_config_ids,
            group_config_names,
            group_group_names,
            *dedicated_fields,
            left=left,
            groupby= groupby,
            orderby = ~db[type].id,
            cacheable=True
        )

        limitby = None
        if page is not None and step is not None:
            limitby = (page*step, (page+1)*step+1) # one more element to indicate if another page exists

        query = ((auth.vidjil_accessible_query(PermissionEnum.read.value, db.sample_set)) &
                (db[type].sample_set_id == db.sample_set.id))

        if (tags is not None and len(tags) > 0):
            query = filter_by_tags(query, self.type, tags)
            count = db.tag.name.count()
            query_gss = db(
                query
            ).select(
                db[type].ALL,
                db.tag_ref.record_id,
                db.tag_ref.table_name,
                count,
                limitby = limitby,
                orderby = ~db[type].id,
                groupby = db.tag_ref.record_id|db.tag_ref.table_name,
                having = count >= len(tags)
            )
        else:
            query_gss = db(
                query
            ).select(
                db[type].ALL,
                limitby = limitby,
                orderby = ~db[type].id
            )

        self.result = query_gss

    def __len__(self):
        return len(self.result)

def filter_by_tags(query, table, tags):
    if tags is not None and len(tags) > 0:
        return (query
            & (db.tag.name.upper().belongs([t.upper() for t in tags]))
            & (db.tag_ref.tag_id == db.tag.id)
            & (db.tag_ref.table_name == table)
            & (db.tag_ref.record_id == db[table].id))
    return query
