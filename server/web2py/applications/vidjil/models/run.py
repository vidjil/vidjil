class Run(SampleSet):
    def __init__(self, type):
        super(Run, self).__init__(type)

    def get_fields(self):
        fields = super(Run, self).get_fields()
        fields.insert(1, {'name': 'run_date', 'sort': 'run_date', 'call': self.get_run_date, 'width': 100, 'public': True})
        return fields

    def get_name(self, data):
        return data.name

    def get_embellished_name(self, data):
        return 'run: %s' % data.name

    def get_run_date(self, data):
        return data.run_date

    def filter(self, filter_str, data):
        for row in data:
            row['string'] = [row['name'], row['confs'], row['groups'], str(row['run_date']), str(row['info'])]
        return filter(lambda row : vidjil_utils.advanced_filter(row['string'], filter_str), data)

    def get_info_dict(self, data):
        return dict(name = "run : " + data.name + " (" + str(data.run_date) + ")",
                    filename = "run : " + data.name + "_" + str(data.run_date),
                    label = data.id_label + " (" + str(data.run_date) + ")",
                    info = data.info
                    )

    def get_add_route(self):
        return 'run/add'

    def get_data(self, sample_set_id):
        return db(db.run.sample_set_id == sample_set_id).select()[0]
