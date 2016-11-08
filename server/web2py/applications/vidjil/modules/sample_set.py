class SampleSet():
    def __init__(self, data, auth):

        self.id = data.id
        self.name = data.name
        self.has_permission = auth.can_modify_sample_set(self.id)
        self.info = data.info
        self.creator = data.creator
        self.confs = ""
        self.conf_list = []
        self.conf_id_list = [-1]
        self.most_used_conf = ""
        self.groups = ""
        self.group_list = []
        self.file_count = 0
        self.size = 0
        self.sample_type = 'sample_set'

    def get_name(self):
        return 'sample set: %s' % self.name

    def get_info(self):
        return self.info

    def render(self):
        return '<tr><td>foobar</td></tr>'
