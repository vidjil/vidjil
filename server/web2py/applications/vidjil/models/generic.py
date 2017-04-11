class Generic(SampleSet):

    def __init__(self, type):
        super(Generic, self).__init__(type)

    def get_type_display(self):
        return 'set'
