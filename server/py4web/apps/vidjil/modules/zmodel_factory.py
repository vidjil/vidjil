# -*- coding: utf-8 -*-
import datetime
from enum import Enum
from apps.vidjil.modules import vidjil_utils
from apps.vidjil.modules.sampleSet import SampleSet
from yatl.helpers import SPAN

from ..common import db, auth

class Generic(SampleSet):

    def __init__(self, type):
        super(Generic, self).__init__(type)
        self.auth = auth
        self.db = db

    def get_type_display(self):
        return 'set'

    def filter(self, filter_str, data):
        keys = ['name', 'confs', 'groups', 'info']
        self.create_filter_string(data, keys)
        return filter(lambda row : vidjil_utils.advanced_filter(row['string'], filter_str), data)

    def get_info_dict(self, data):
        return dict(name = self.get_display_name(data),
                filename = "sample_set_%d" % data['id'],
                label = "",
                info = ""
                )

    def get_data(self, sample_set_id):
        return self.db(self.db.generic.sample_set_id == sample_set_id).select()[0]

    def get_id_string(self, data):
        name = data['name'] if data['name'] is not None else "Unnamed Sample Set"
        return ":s %s (%d)" % (name, data['sample_set_id'])

    def validate(self, data):
        error = []
        if data["name"] == "":
            error.append("name needed")
        if data["name"].find("|") >= 0:
            error.append("illegal character '|' in name")
        return error

    def get_dedicated_fields(self):
        table = self.db[self.type]
        return [
            table.name.with_alias('name')
        ]

    def get_dedicated_group(self):
        table = self.db[self.type]
        return [table.name]

    def get_filtered_fields(self, search):
        table = self.db[self.type]
        return table.name.contains(search)



class Patient(SampleSet):

    def __init__(self, type):
        super(Patient, self).__init__(type)
        self.auth = auth
        self.db = db

    def get_fields(self):
        fields = super(Patient, self).get_fields()
        fields.insert(1, {'name': 'Birth date', 'sort': 'birth', 'call': self.get_birth, 'sort_call': self.get_birth, 'width': '80px', 'public': True})
        return fields

    def get_reduced_fields(self):
        fields = super(Patient, self).get_reduced_fields()
        fields.insert(1, {'name': 'Birth date', 'sort': 'birth', 'call': self.get_birth, 'sort_call': self.get_birth, 'width': '80px', 'public': True})
        return fields

    def get_name(self, data, anon=None):
        sample_set_id = None
        if data['sample_set_id'] and data['sample_set_id'] != '' :
            sample_set_id = int(data['sample_set_id'])
        return vidjil_utils.anon_names(sample_set_id, data['first_name'], data['last_name'], anon)

    def get_display_name(self, data, anon=None):
        return SPAN(vidjil_utils.display_names(data.sample_set_id, data.first_name, data.last_name, anon), _class="set_token patient_token")

    def get_birth(self, data):
        return "%s" % str(data['birth']) if data['birth'] is not None else ''

    def filter(self, filter_str, data):
        keys = ['last_name', 'first_name', 'confs', 'groups', 'birth', 'info']
        self.create_filter_string(data, keys)
        return filter(lambda row : vidjil_utils.advanced_filter(row['string'], filter_str), data)

    def get_info_dict(self, data):
        name = self.get_display_name(data)

        label = data['id_label'] 
        if data['id_label'] is None:
            label = ''

        return dict(name = name,
                    filename = self.get_name(data),
                    label = label + " (" + str(data['birth']) + ")",
                    info = data['info']
                    )

    def get_data(self, sample_set_id):
        return self.db(self.db.patient.sample_set_id == sample_set_id).select()[0]

    def get_id_string(self, data):
        name = self.get_name(data)
        ident = " (%d)" % data['sample_set_id']
        birth = ""
        if data['birth'] is not None:
            birth = " (%s)" % data['birth']
        return ":p %s%s%s" % (name, birth, ident)

    def validate(self, data):
        error = []
        if data["first_name"] == "" :
            error.append("first name needed")
        if data["last_name"] == "" :
            error.append("last name needed")
        if data["birth"] != "" :
            try:
                datetime.datetime.strptime(""+data['birth'], '%Y-%m-%d')
            except ValueError:
                error.append("date (wrong format)")
        if (data["first_name"] + data['last_name']).find('|') >= 0:
            error.append("illegal character '|' in name")
        return error

    def get_dedicated_fields(self):
        table = self.db[self.type]
        return [
            table.first_name.with_alias('first_name'),
            table.last_name.with_alias('last_name'),
            table.birth.with_alias('birth'),
        ]

    def get_dedicated_group(self):
        table = self.db[self.type]
        return [table.first_name, table.last_name, table.birth]

    def get_filtered_fields(self, search):
        table = self.db[self.type]
        return (table.first_name.contains(search) |
                table.last_name.contains(search))

    def get_name_filter_query(self, query):
        if query is None or query == '':
            return (self.db[self.type].id > 0)
        return ((self.db[self.type].first_name.like('%' + query + "%")) |
                (self.db[self.type].last_name.like('%' + query + '%')))



class Run(SampleSet):
    def __init__(self, type):
        super(Run, self).__init__(type)
        self.auth = auth
        self.db = db

    def get_fields(self):
        fields = super(Run, self).get_fields()
        fields.insert(1, {'name': 'Run date', 'sort': 'run_date', 'call': self.get_run_date, 'sort_call': self.get_run_date, 'width': '80px', 'public': True})
        return fields

    def get_reduced_fields(self):
        fields = super(Run, self).get_reduced_fields()
        fields.insert(1, {'name': 'Run date', 'sort': 'run_date', 'call': self.get_run_date, 'sort_call': self.get_run_date, 'width': '80px', 'public': True})
        return fields

    def get_name(self, data):
        return data['name']

    def get_display_name(self, data):
        return SPAN(self.get_name(data), _class="set_token run_token")

    def get_embellished_name(self, data):
        return 'run: %s' % data['name']

    def get_run_date(self, data):
        return "%s" % str(data['run_date']) if data['run_date'] is not None else ''

    def filter(self, filter_str, data):
        keys = ['name', 'confs', 'groups', 'run_date', 'info']
        self.create_filter_string(data, keys)
        return filter(lambda row : vidjil_utils.advanced_filter(row['string'], filter_str), data)

    def get_info_dict(self, data):
        return dict(name = self.get_display_name(data),
                    filename = "run : " + data['name'] + "_" + str(data['run_date']),
                    label = data['id_label'] + " (" + str(data['run_date']) + ")",
                    info = data['info']
                    )

    def get_data(self, sample_set_id):
        return self.db(self.db.run.sample_set_id == sample_set_id).select()[0]

    def get_id_string(self, data):
        name = data['name']
        ident = " (%d)" % data['sample_set_id']
        run_date = ""
        if data['run_date'] is not None:
            run_date = " (%s)" % data['run_date']
        return ":r %s%s%s" % (name, run_date, ident)

    def validate(self, data):
        error = []
        if data["name"] == "":
            error.append("name needed")

        if data["run_date"] != "":
            try:
                datetime.datetime.strptime(""+data['run_date'], '%Y-%m-%d')
            except ValueError:
                error.append("date (wrong format)")
        if data["name"].find("|") >= 0:
            error.append("illegal character '|' in name")

        return error

    def get_dedicated_fields(self):
        table = self.db[self.type]
        return [
            table.name.with_alias('name'),
            table.run_date.with_alias('run_date'),
        ]

    def get_dedicated_group(self):
        table = self.db[self.type]
        return [table.name]

    def get_filtered_fields(self, search):
        table = self.db[self.type]
        return table.name.contains(search)



class FactoryEnum(Enum):
    generic = Generic
    patient = Patient
    run = Run

class ModelFactory():

    def __init__(self):
        #filler constructor, do we need a class here ?
        self.id = 0

    def get_instance(self, type):
        return FactoryEnum[type].value(type)

