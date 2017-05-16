class Generic(SampleSet):

    def __init__(self, type):
        super(Generic, self).__init__(type)

    def get_type_display(self):
        return 'set'

    def filter(self, filter_str, data):
        for row in data:
            row['string'] = [row['name'], row['confs'], row['groups'], str(row['info'])]
        return filter(lambda row : vidjil_utils.advanced_filter(row['string'], filter_str), data)

    def get_info_dict(self, data):
        return dict(name = "set : %s" % self.get_name(data),
                filename = "sample_set_%d" % data.id,
                label = "",
                info = ""
                )

    def get_add_route(self):
        return 'sample_set/add'

    def get_data(self, sample_set_id):
        return db(db.generic.sample_set_id == sample_set_id).select()[0]
