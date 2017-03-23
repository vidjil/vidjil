class SampleSet(object):

    def __init__(self, type):
        self.type = type

    def get_type(self):
        return self.type

    def get_type_display(self):
        return 'set' if self.type == defs.SET_TYPE_GENERIC else self.type

    def __getitem__(self, key):
        return getattr(self, key, None)

    def get_name(self, data):
        return data.name

    def get_info(self, data):
        return data.info

    def get_configs(self, data):
        return data.conf_list

    def get_config_urls(self, data):
        configs = []
        for conf in data.conf_list:
            filename =  "(%s %s)" % (self.get_name(data), conf['name'])
            if conf['fused_file'] is not None :
                configs.append(
                    str(A(conf['name'],
                        _href="index.html?sample_set_id=%d&config=%d" % (data.sample_set_id, conf['id']), _type="text/html",
                        _onclick="event.preventDefault();event.stopPropagation();if( event.which == 2 ) { window.open(this.href); } else { db.load_data( { 'sample_set_id' : '%d', 'config' :  %d }, '%s' ); }" % (data.sample_set_id, conf['id'], filename))))
            else:
                configs.append(conf['name'])
        return XML(", ".join(configs))

    def get_groups(self, data):
        return data.group_list

    def get_groups_string(self, data):
        return ', '.join([group for group in data.group_list if group != 'admin'])

    def get_creator(self, data):
        return data.creator

    def get_files(self, data):
        return '%d (%s)' % (data.file_count, vidjil_utils.format_size(data.size))

    def get_fields(self):
        fields = []
        fields.append({'name': 'name', 'sort': 'name', 'call': self.get_name, 'width': 200, 'public': True})
        fields.append({'name': 'info', 'sort': 'info', 'call': self.get_info, 'width': None, 'public': True})
        fields.append({'name': 'results', 'sort': 'confs', 'call': self.get_config_urls, 'width': None, 'public': True})
        if auth.is_admin() or len(get_group_list(auth)) > 1:
            fields.append({'name': 'groups', 'sort': 'groups', 'call': self.get_groups_string, 'width': 100, 'public': True})
            fields.append({'name': 'creator', 'sort': 'creator', 'call': self.get_creator, 'width': 100, 'public': True})
        fields.append({'name': 'files', 'sort': 'file_count', 'call': self.get_files, 'width': 100, 'public': True})
        return fields

    def get_sequence_count(self, data):
        if not hasattr(data, 'sequence_count'):
            data.sequence_count = db( (db.sequence_file.id == db.sample_set_membership.sequence_file_id)
                    &(db.sample_set_membership.sample_set_id == db[self.type].sample_set_id)
                    &(db[self.type].id == data.id)).count()
        return data.sequence_count

    def get_data_count(self, data):
        if not hasattr(data, 'data_count'):
            data.data_count = db( (db.sequence_file.id == db.sample_set_membership.sequence_file_id)
                &(db.sample_set_membership.sample_set_id == db[self.type].sample_set_id)
                &(db[self.type].id == data.id)
                &(db.results_file.sequence_file_id == db.sequence_file.id)).count()
        return data.data_count

    def filter(self, filter_str, data):
        for row in data:
            row['string'] = [row['name'], row['confs'], row['groups'], str(row['info'])]
        return filter(lambda row : vidjil_utils.advanced_filter(row['string'], filter_str), data)

    def get_add_route(self):
        return 'sample_set/add'

    def get_info_dict(self, data):
        return dict(name = "set : %s" % self.get_name(data),
                filename = "sample_set_%d" % data.id,
                label = "",
                info = ""
                )

    def get_data(self, sample_set_id):
        return db(db.generic.sample_set_id == sample_set_id).select()[0]
