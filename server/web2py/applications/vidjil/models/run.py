class Run(SampleSet):
    def __init__(self, type):
        super(Run, self).__init__(type)

    def get_fields(self):
        fields = super(Run, self).get_fields()
        fields.insert(1, {'name': 'run_date', 'sort': 'run_date', 'call': self.get_run_date, 'width': 100, 'public': True})
        return fields

    def get_reduced_fields(self):
        fields = super(Run, self).get_reduced_fields()
        fields.insert(1, {'name': 'run_date', 'sort': 'run_date', 'call': self.get_run_date, 'width': 100, 'public': True})
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
        return dict(name = "run : " + data['name'] + " (" + str(data['run_date']) + ")",
                    filename = "run : " + data['name'] + "_" + str(data['run_date']),
                    label = data['id_label'] + " (" + str(data['run_date']) + ")",
                    info = data['info']
                    )

    def get_data(self, sample_set_id):
        return db(db.run.sample_set_id == sample_set_id).select()[0]

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
