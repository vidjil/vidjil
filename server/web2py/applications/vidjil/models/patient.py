import vidjil_utils

class Patient(SampleSet):

    def __init__(self, type):
        super(Patient, self).__init__(type)

    def get_fields(self):
        fields = super(Patient, self).get_fields()
        fields.insert(1, {'name': 'birth', 'sort': 'birth', 'call': self.get_birth, 'width': 100, 'public': True})
        return fields

    def get_name(self, data, anon=None):
        return vidjil_utils.anon_names(data.id, data.first_name, data.last_name, anon)

    def get_birth(self, data):
        return "%s" % str(data.birth) if data.birth is not None else ''

    def filter(self, filter_str, data):
        for row in data:
            row['string'] = [row['last_name'], row['first_name'], row['confs'], row['groups'], str(row['birth']), str(row['info'])]
        return filter(lambda row : vidjil_utils.advanced_filter(row['string'], filter_str), data)

    def get_info_dict(self, data):
        name = self.get_name(data)
        return dict(name = name,
                    filename = name,
                    label = data.id_label + " (" + str(data.birth) + ")",
                    info = data.info
                    )

    def get_data(self, sample_set_id):
        return db(db.patient.sample_set_id == sample_set_id).select()[0]
