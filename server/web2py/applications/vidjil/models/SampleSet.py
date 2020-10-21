from abc import ABCMeta, abstractmethod

class SampleSet(object):
    __metaclass__ = ABCMeta

    def __init__(self, type):
        self.type = type
        prefix = get_tag_prefix()
        self.tag_decorator = TagDecorator(prefix)

    def get_type(self):
        return self.type

    def get_type_display(self):
        return self.type

    def __getitem__(self, key):
        return getattr(self, key, None)

    def get_name(self, data):
        return data['name']

    def get_display_name(self, data):
        return SPAN(self.get_name(data), _class="set_token generic_token")

    def get_info(self, data):
        return data['info']

    def get_tagged_info(self, data):
        text = self.tag_decorator.decorate(data['info'], 'tag', self.type, self.get_list_path())
        return self.tag_decorator.sanitize(text)

    def get_stats_tagged_info(self, data):
        text = self.tag_decorator.decorate(data.info, 'tag', self.type, self.get_stats_path())
        return self.tag_decorator.sanitize(text)

    def get_configs(self, data):
        conf_list = get_conf_list_select()
        return data._extra[conf_list]

    def get_list_path(self):
        return '/sample_set/all'

    def get_stats_path(self):
        return '/sample_set/stats'

    def get_config_urls(self, data):
        configs = []
        http_origin = ""
        if request.env['HTTP_ORIGIN'] is not None:
            http_origin = request.env['HTTP_ORIGIN'] + "/"
        key = get_conf_list_select()
        conf_list = [] if data._extra[key] is None else data._extra[key].split(';')
        for conf in conf_list:
            c = conf.split(',')
            filename =  "(%s %s)" % (self.get_name(data), c[1])
            if c[2] is not None :
                configs.append(
                    str(A(c[1],
                        _href="index.html?sample_set_id=%d&config=%s" % (data['sample_set_id'], c[0]), _type="text/html",
                        _onclick="event.preventDefault();event.stopPropagation();if( event.which == 2 ) { window.open(this.href); } else { myUrl.loadUrl(db, { 'sample_set_id' : '%d', 'config' :  %s }, '%s' ); }" % (data['sample_set_id'], c[0], filename))))
            else:
                configs.append(c[1])
        return XML(", ".join(configs))

    def get_groups(self, data):
        key = get_group_names_select()
        return data._extra[key]

    def get_groups_string(self, data):
        key = get_group_names_select()
        group_list = [] if data._extra[key] is None else data._extra[key].split()
        return ', '.join([group for group in group_list if group != 'admin'])

    def get_creator(self, data):
        return data['creator']

    def get_files(self, data):
        size = 0 if data['size'] is None else data['size']
        file_count = 0 if data['file_count'] is None else data['file_count']
        return '%d (%s)' % (file_count, vidjil_utils.format_size(size))

    def get_fields(self):
        fields = []
        fields.append({'name': 'name', 'sort': 'name', 'call': self.get_display_name, 'width': 200, 'public': True})
        fields.append({'name': 'info', 'sort': 'info', 'call': self.get_tagged_info, 'width': None, 'public': True})
        fields.append({'name': 'results', 'sort': 'confs', 'call': self.get_config_urls, 'width': None, 'public': True})
        if auth.is_admin() or len(get_group_list(auth)) > 1:
            fields.append({'name': 'groups', 'sort': 'groups', 'call': self.get_groups_string, 'width': 100, 'public': True})
            fields.append({'name': 'creator', 'sort': 'creator', 'call': self.get_creator, 'width': 100, 'public': True})
        fields.append({'name': 'files', 'sort': 'file_count', 'call': self.get_files, 'width': 100, 'public': True})
        return fields

    def get_sort_fields(self):
        fields = {}
        for field in self.get_fields():
            fields[field['sort']] = field
        return fields

    def get_reduced_fields(self):
        fields = []
        fields.append({'name': 'name', 'sort': 'name', 'call': self.get_name, 'width': 200, 'public': True})
        fields.append({'name': 'info', 'sort': 'info', 'call': self.get_stats_tagged_info, 'width': None, 'public': True})
        fields.append({'name': 'files', 'sort': 'file_count', 'call': self.get_files, 'width': 100, 'public': True})
        return fields

    def get_sequence_count(self, data):
        if not hasattr(data, 'sequence_count'):
            data['sequence_count'] = db( (db.sequence_file.id == db.sample_set_membership.sequence_file_id)
                    &(db.sample_set_membership.sample_set_id == db[self.type].sample_set_id)
                    &(db[self.type].id == data['id'])).count()
        return data['sequence_count']

    def get_data_count(self, data):
        if not hasattr(data, 'data_count'):
            data['data_count'] = db( (db.sequence_file.id == db.sample_set_membership.sequence_file_id)
                &(db.sample_set_membership.sample_set_id == db[self.type].sample_set_id)
                &(db[self.type].id == data['id'])
                &(db.results_file.sequence_file_id == db.sequence_file.id)).count()
        return data['data_count']

    def create_filter_string(self, data, keys):
        for row in data:
            row['string'] = []
            for key in keys:
                if key in row:
                    row['string'].append(str(row[key]))

    def get_name_filter_query(self, query):
        if query is None or query == '':
            return (db[self.type].name != None)
        return (db[self.type].name.like('%' + query + "%"))

    @abstractmethod
    def filter(self, filter_str, data):
        pass

    @abstractmethod
    def get_info_dict(self, data):
        pass

    @abstractmethod
    def get_data(self, sample_set_id):
        pass

    @abstractmethod
    def get_id_string(self, data):
        pass

    def parse_id_string(self, string):
        try:
            value = string[string.rfind("(")+1:string.rfind(")")]
            return int(value)
        except:
            raise ValueError('invalid input %s' % string)

    @abstractmethod
    def validate(self, data):
        pass

    @abstractmethod
    def get_dedicated_fields(self):
        pass

    @abstractmethod
    def get_dedicated_group(self):
        pass

def get_sample_name(sample_set_id):
    '''
    Return the name associated with a sample set (eg. a run or a
    patient) if any
    '''
    sample = db.sample_set[sample_set_id]
    if sample is None or (sample.sample_type != defs.SET_TYPE_PATIENT \
                          and sample.sample_type != defs.SET_TYPE_RUN \
                          and sample.sample_type != defs.SET_TYPE_GENERIC):
        return None

    sample_type = sample.sample_type
    patient_or_run = db[sample_type](db[sample_type].sample_set_id == sample_set_id)
    if patient_or_run is None:
        return None
    if sample.sample_type == defs.SET_TYPE_PATIENT:
        return vidjil_utils.anon_ids([patient_or_run.id])[0]
    return patient_or_run.name

def get_set_group(sid):
    '''
    Return the group associated with the set
    '''
    perm = db((db.auth_permission.table_name == 'sample_set') &
              (db.auth_permission.record_id == sid) &
              (db.auth_permission.name == PermissionEnum.access.value)
            ).select().first()
    return perm.group_id

def get_sample_set_id_from_results_file(results_file_id):
    '''
    Return the sample set ID corresponding to a result file ID
    '''
    sample_set_id = db((db.sequence_file.id == db.results_file.sequence_file_id)
                    &(db.results_file.id == results_file_id)
                    &(db.sample_set_membership.sequence_file_id == db.sequence_file.id)
                    &(db.sample_set.id == db.sample_set_membership.sample_set_id)
                ).select(db.sample_set_membership.sample_set_id).first().sample_set_id
    return sample_set_id

def get_conf_list_select():
    return "GROUP_CONCAT(DISTINCT CONCAT(config.id, ',', config.name, ',', fused_file.fused_file) SEPARATOR ';')"

def get_config_ids_select():
    return "GROUP_CONCAT(DISTINCT config.id)"

def get_config_names_select():
    return "GROUP_CONCAT(DISTINCT config.name)"

def get_group_names_select():
    return "GROUP_CONCAT(DISTINCT auth_group.role)"
