# -*- coding: utf-8 -*-

from abc import ABCMeta, abstractmethod
from yatl.helpers import SPAN, XML, A, BUTTON

from ..modules.tag import TagDecorator, get_tag_prefix
from ..modules import vidjil_utils
from ..modules.permission_enum import PermissionEnum
from .. import defs, user_groups
from ..common import db, auth

class SampleSet(object):
    __metaclass__ = ABCMeta

    def __init__(self, type):
        self.type = type
        prefix = get_tag_prefix()
        self.tag_decorator = TagDecorator(prefix)
        self.db = db
        self.auth =auth

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
        text = self.tag_decorator.decorate(self.get_info(data), 'tag', self.type, self.get_list_path())
        sanitized_text = self.tag_decorator.sanitize(text)
        return SPAN(sanitized_text, _title=self.get_info(data))

    def get_stats_tagged_info(self, data):
        text = self.tag_decorator.decorate(self.get_info(data), 'tag', self.type, self.get_stats_path())
        sanitized_text = self.tag_decorator.sanitize(text)
        return SPAN(sanitized_text, _title=self.get_info(data))

    def get_configs(self, data):
        conf_list = get_conf_list_select()
        return data._extra[conf_list]

    def get_list_path(self):
        return '/sample_set/all'

    def get_stats_path(self):
        return '/sample_set/stats'
    
    def get_splitted_configs(self, data):
        configs = []
        key = get_conf_list_select()
        conf_list = [] if data["_extra"][key] is None else data["_extra"][key].split(',')
        for conf in conf_list:
            configs.append(conf.split(';'))
        return configs

    def get_config_urls(self, data):
        configs = []
        splitted_configs = self.get_splitted_configs(data)
        for splitted_conf in splitted_configs:
            c_id = splitted_conf[0]
            c_name = splitted_conf[1]
            filename =  f"({self.get_name(data)} {c_id})"

            configs.append(
                str(SPAN(
                    A(c_name, SPAN(_class="icon-chart-bar"),
                      _href=f"index.html?sample_set_id={int(data['sample_set_id'])}&config={c_id}", 
                      _type="text/html", _id=f"result_sample_set_{int(data['sample_set_id'])}_config_{c_id}",
                      _class="double_button__part1", _title=f"Display results for config {c_name}",
                      _onclick="event.preventDefault();event.stopPropagation();if(event.which == 2) { window.open(this.href); } else { myUrl.loadUrl(db, { 'sample_set_id' : '%d', 'config' :  %s }, '%s' ); }" % (data['sample_set_id'], c_id, filename)),
                    SPAN(SPAN(_class="icon-table"),
                      _class="double_button__part2", _title=f"Preview / quality control for config {c_name}",
                      _onclick=f"db.call('sample_set/multi_sample_stats', {{'sample_set_id': {data['sample_set_id']}, 'config_id' : {c_id} }})"),
                    _type="button", _class="double_button")))

        return XML(" ".join(configs))
    
    def get_sort_configs(self, data):
        conf_names = []        
        splitted_configs = self.get_splitted_configs(data)
        for splitted_conf in splitted_configs:
            conf_names.append(splitted_conf[1])
        return(",".join(conf_names))

    def get_groups(self, data):
        key = get_group_names_select()
        return data._extra[key]

    def get_groups_string(self, data):
        key = get_group_names_select()
        group_list = [] if data._extra[key] is None else data._extra[key].split(',')
        display_group_list = ', '.join([group for group in group_list if group != 'admin'])
        return SPAN(display_group_list, _title=display_group_list)

    def get_creator(self, data):
        return data['creator']

    def get_creator_string(self, data):
        creator = self.get_creator(data)
        return SPAN(creator, _title=creator)

    def get_file_count(self, data):
        return data['file_count']

    def get_files_values(self, data):
        key = get_file_sizes_select()
        size = 0 if data._extra[key] is None else data._extra[key]
        file_count = self.get_file_count(data)
        return file_count, size

    def get_files(self, data):
        file_count, size = self.get_files_values(data)
        files_display = f"{file_count} ({vidjil_utils.format_size(size)})"
        return SPAN(files_display, _title=files_display)

    def get_fields(self):
        fields = []
        fields.append({'name': 'Name', 'sort': 'name', 'call': self.get_display_name, 'sort_call': self.get_name, 'width': '200px', 'public': True})
        fields.append({'name': 'Info', 'sort': 'info', 'call': self.get_tagged_info, 'sort_call': self.get_info, 'width': '300px', 'public': True})
        fields.append({'name': 'Results', 'sort': 'confs', 'call': self.get_config_urls, 'sort_call': self.get_sort_configs, 'width': None, 'public': True})
        if self.auth.is_admin() or len(user_groups.get_group_list(self.auth)) > 1:
            fields.append({'name': 'Groups', 'sort': 'groups', 'call': self.get_groups_string, 'sort_call': self.get_groups_string, 'width': '80px', 'public': True})
            fields.append({'name': 'Creator', 'sort': 'creator', 'call': self.get_creator_string, 'sort_call': self.get_creator, 'width': '100px', 'public': True})
        fields.append({'name': 'Files', 'sort': 'file_count', 'call': self.get_files, 'sort_call': self.get_file_count, 'width': '80px', 'public': True})
        return fields

    def get_sort_fields(self):
        fields = {}
        for field in self.get_fields():
            fields[field['sort']] = field
        return fields

    def get_reduced_fields(self):
        fields = []
        fields.append({'name': 'Name', 'sort': 'name', 'call': self.get_name, 'sort_call': self.get_name, 'width': '200px', 'public': True})
        fields.append({'name': 'Info', 'sort': 'info', 'call': self.get_stats_tagged_info, 'sort_call': self.get_info, 'width': None, 'public': True})
        fields.append({'name': 'Files', 'sort': 'file_count', 'call': self.get_files, 'sort_call': self.get_file_count, 'width': '100px', 'public': True})
        return fields

    def get_sequence_count(self, data):
        db = self.db
        if not hasattr(data, 'sequence_count'):
            data['sequence_count'] = db( (db.sequence_file.id == db.sample_set_membership.sequence_file_id)
                    &(db.sample_set_membership.sample_set_id == db[self.type].sample_set_id)
                    &(db[self.type].id == data['id'])).count()
        return data['sequence_count']

    def get_data_count(self, data):
        db = self.db
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
        db = self.db
        if query is None or query == '':
            return (db[self.type].name is not None)
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

    @abstractmethod
    def get_filtered_fields(self, search):
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
    return "GROUP_CONCAT(DISTINCT config.id, ';', config.name, ';', fused_file.fused_file)"

def get_config_ids_select():
    return "GROUP_CONCAT(DISTINCT config.id)"

def get_config_names_select():
    return "GROUP_CONCAT(DISTINCT config.name)"

def get_group_names_select():
    return "GROUP_CONCAT(DISTINCT auth_group.role)"

def get_file_sizes_select():
    return "COUNT(DISTINCT sequence_file.id) * SUM(sequence_file.size_file) / COUNT(*)"
