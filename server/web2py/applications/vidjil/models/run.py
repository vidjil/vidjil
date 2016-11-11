class Run(SampleSet):
    def __init__(self, data):
        super(Run, self).__init__(data)
        self.run_date = data.date
        self.id_label = data.id_label
        self.sequencer = data.sequencer
        self.pcr = data.pcr

    def get_fields(self):
        fields = super(Run, self).get_fields()
        fields.insert(1, {'name': 'run_date', 'sort': 'run_date', 'call': self.get_run_date, 'width': 100, 'public': True})
        return fields

    def get_name(self):
        return self.name

    def get_embellished_name(self):
        return 'run: %s' % self.name

    def get_birth(self):
        return self.birth

def get_run(id):
    data = db.run[id]
    return Run(data)
