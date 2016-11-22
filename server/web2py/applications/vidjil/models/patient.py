class Patient(SampleSet):

    def __init__(self, type):
        super(Patient, self).__init__(type)

    def get_fields(self):
        fields = super(Patient, self).get_fields()
        fields.insert(1, {'name': 'birth', 'sort': 'birth', 'call': self.get_birth, 'width': 100, 'public': True})
        return fields

    def get_name(self, data):
        return vidjil_utils.anon_names(data.id, data.first_name, data.last_name, data.anon_allowed)

    def get_birth(self, data):
        return "%s" % str(data.birth) if data.birth is not None else ''
