class SampleSet():
    def __init__(self, data):

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
        self.sequence_count = None
        self.data_count = None

    def get_name(self):
        return 'sample set: %s' % self.name

    def get_type(self):
        return self.sample_type

    def get_info(self):
        return self.info

    def render(self):
        return '<tr><td>foobar</td></tr>'

    def get_sequence_count(self):
        if self.sequence_count is None:
            self.sequence_count = db( (db.sequence_file.id == db.sample_set_membership.sequence_file_id)
                    &(db.sample_set_membership.sample_set_id == db.patient.sample_set_id)
                    &(db.patient.id == self.id)).count()
        return self.sequence_count

    def get_data_count(self):
        if self.data_count is None:
            self.data_count = db( (db.sequence_file.id == db.sample_set_membership.sequence_file_id)
                &(db.sample_set_membership.sample_set_id == db.patient.sample_set_id)
                &(db.patient.id == self.id)
                &(db.results_file.sequence_file_id == db.sequence_file.id)).count()
        return self.data_count

def get_sample_set(id):
    data = db.sample_set[id]
    return SampleSet(data)
