#!/usr/bin/python

from jsonstreamer import JSONStreamer

def _catch_all(event_name, *args):
    print('\t{} : {}'.format(event_name, args))

class VidjilStreamer(JSONStreamer):

    def __init__(self):
        super(VidjilStreamer, self).__init__()

    def value_listener(self, value, *args):
        print('stack: {}'.format(self._stack))
        print('\tValue: {}'.format(value))

    def run(self):
        fusefile = open('/home/ryan/fused_file.fused', 'r')
        print("parsing the fuse:")
        streamer.add_catch_all_listener(_catch_all)
        #self.add_listener(JSONStreamer.VALUE_EVENT, self.value_listener)
        self.consume(fusefile.read())


streamer = VidjilStreamer()
streamer.run()
