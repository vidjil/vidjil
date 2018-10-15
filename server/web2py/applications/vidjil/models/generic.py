class Generic(SampleSet):

    def __init__(self, type):
        super(Generic, self).__init__(type)

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
        return db(db.generic.sample_set_id == sample_set_id).select()[0]

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
