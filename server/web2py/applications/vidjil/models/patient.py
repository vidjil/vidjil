import vidjil_utils

class Patient(SampleSet):

    def __init__(self, type):
        super(Patient, self).__init__(type)

    def get_fields(self):
        fields = super(Patient, self).get_fields()
        fields.insert(1, {'name': 'birth', 'sort': 'birth', 'call': self.get_birth, 'width': 100, 'public': True})
        return fields

    def get_reduced_fields(self):
        fields = super(Patient, self).get_reduced_fields()
        fields.insert(1, {'name': 'birth', 'sort': 'birth', 'call': self.get_birth, 'width': 100, 'public': True})
        return fields

    def get_name(self, data, anon=None):
        return vidjil_utils.anon_names(data['sample_set_id'], data['first_name'], data['last_name'], anon)

    def get_display_name(self, data, anon=None):
        return vidjil_utils.display_names(data.sample_set_id, data.first_name, data.last_name, anon)

    def get_birth(self, data):
        return "%s" % str(data['birth']) if data['birth'] is not None else ''

    def filter(self, filter_str, data):
        keys = ['last_name', 'first_name', 'confs', 'groups', 'birth', 'info']
        self.create_filter_string(data, keys)
        return filter(lambda row : vidjil_utils.advanced_filter(row['string'], filter_str), data)

    def get_info_dict(self, data):
        name = self.get_display_name(data)
        return dict(name = name,
                    filename = name,
                    label = data['id_label'] + " (" + str(data['birth']) + ")",
                    info = data['info']
                    )

    def get_data(self, sample_set_id):
        return db(db.patient.sample_set_id == sample_set_id).select()[0]

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

    def get_name_filter_query(self, query):
        if query is None or query == '':
            return (db[self.type].id > 0)
        return ((db[self.type].first_name.like('%' + query + "%")) |
                (db[self.type].last_name.like('%' + query + '%')))
