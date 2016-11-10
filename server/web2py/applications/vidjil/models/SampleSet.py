class SampleSet(object):
    def __init__(self, data):

        self.id = data.id
        self.name = data.name
        self.has_permission = auth.can_modify_sample_set(self.id)
        self.info = data.info
        self.creator = data.creator
        self.confs = ""
        self.conf_list = []
        self.conf_id_list = [-1]
        self.most_used_conf = ""
        self.groups = ""
        self.group_list = []
        self.file_count = 0
        self.size = 0
        self.sample_type = data.sample_type
        self.sequence_count = None
        self.data_count = None

    def __getitem__(self, key):
        return getattr(self, key, None)

    def get_name(self):
        return 'sample set: %s' % self.name

    def get_type(self):
        return self.sample_type

    def get_info(self):
        return self.info

    def get_configs(self):
        return self.conf_list

    def get_config_urls(self):
        configs = []
        for conf in self.conf_list:
            filename =  "(%s %s)" % (self.get_name(), conf['name'])
            if conf['fused_file'] is not None :
                configs.append(
                    str(A(conf['name'],
                        _href="index.html?sample_set=%d&config=%d" % (self.id, conf['id']), _type="text/html",
                        _onclick="event.preventDefault();event.stopPropagation();if( event.which == 2 ) { window.open(this.href); } else { db.load_data( { 'sample_set' : '%d', 'config' :  %d }, '%s' ); }" % (self.id, conf['id'], filename))))
            else:
                configs.append(conf['name'])
        return XML(", ".join(configs))

    def get_groups(self):
        return self.group_list

    def get_groups_string(self):
        return ', '.join([group for group in self.group_list if group != 'admin'])

    def get_creator(self):
        return self.creator

    def get_files(self):
        return '%d (%s)' % (self.file_count, vidjil_utils.format_size(self.size))

    def get_fields(self):
        fields = []
        fields.append({'name': 'name', 'sort': 'name', 'call': self.get_name, 'width': 200, 'public': True})
        fields.append({'name': 'info', 'sort': 'info', 'call': self.get_info, 'width': None, 'public': True})
        fields.append({'name': 'results', 'sort': 'configs', 'call': self.get_config_urls, 'width': None, 'public': True})
        fields.append({'name': 'groups', 'sort': 'groups', 'call': self.get_groups_string, 'width': 100, 'public': False})
        fields.append({'name': 'creator', 'sort': 'creator', 'call': self.get_creator, 'width': 100, 'public': False})
        fields.append({'name': 'files', 'sort': 'files', 'call': self.get_files, 'width': 100, 'public': True})
        return fields

    def get_sequence_count(self):
        if self.sequence_count is None:
            self.sequence_count = db( (db.sequence_file.id == db.sample_set_membership.sequence_file_id)
                    &(db.sample_set_membership.sample_set_id == db.patient.sample_set_id)
                    &(db.patient.id == self.id)).count()
        return self.sequence_count

    def get_data_count(self):
        if self.data_count is None:
            self.data_count = db( (db.sequence_file.id == db.sample_set_membership.sequence_file_id)
                &(db.sample_set_membership.sample_set_id == db.patient.sample_set_id)
                &(db.patient.id == self.id)
                &(db.results_file.sequence_file_id == db.sequence_file.id)).count()
        return self.data_count

def get_sample_set(id):
    data = db.sample_set[id]
    return SampleSet(data)

def get_default_fields():
    fields = []
    fields.append({'name': 'name', 'sort': 'name', 'width': 200, 'public': True})
    fields.append({'name': 'info', 'sort': 'info', 'width': None, 'public': True})
    fields.append({'name': 'results', 'sort': 'configs', 'width': None, 'public': True})
    fields.append({'name': 'groups', 'sort': 'groups', 'width': 100, 'public': False})
    fields.append({'name': 'creator', 'sort': 'creator', 'width': 100, 'public': False})
    fields.append({'name': 'files', 'sort': 'files', 'width': 100, 'public': True})
    return fields
