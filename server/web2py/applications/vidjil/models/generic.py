class Generic(SampleSet):

    def __init__(self, type):
        super(Generic, self).__init__(type)

    def get_type_display(self):
        return 'set'

    def get_config_urls(self, data):
        configs = []
        for conf in data.conf_list:
            filename =  "(%s %s)" % (self.get_name(data), conf['name'])
            if conf['fused_file'] is not None :
                configs.append(
                    str(A(conf['name'],
                        _href="index.html?sample_set_id=%d&config=%d" % (data.sample_set_id, conf['id']), _type="text/html",
                        _onclick="event.preventDefault();event.stopPropagation();if( event.which == 2 ) { window.open(this.href); } else { db.load_data( { 'sample_set_id' : '%d', 'config' :  %d }, '%s' ); }" % (data.sample_set_id, conf['id'], filename))))
            else:
                configs.append(conf['name'])
        return XML(", ".join(configs))

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
