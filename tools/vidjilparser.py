#!/usr/bin/python
import ijson

class VidjilWriter(object):

    def __init__(self, filepath, pretty=False):
        self._filepath = filepath
        self.pretty = pretty
        self.buffer = ""
        self.buffering = False
        self.conserveBuffer = False

    def __enter__(self):
        self.file = open(self._filepath, 'w')
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        self.file.close()

    def write(self, prefix, event, value, previous):
        res = self._write(prefix, event, value, previous)
        if self.buffering:
            self.buffer += res
            return ""
        else:
            self.file.write(res)
            return res

    def _write(self, prefix, event, value, previous):
        if self.pretty:
            end = '\n'
        else:
            end = ''
        if event == 'start_map':
            mstr = '{{'
        elif event == 'end_map':
            mstr = '}},'
        elif event == 'start_array':
            mstr = '['
        elif event == 'end_array':
            mstr = '],'
        elif event == 'map_key':
            mstr = '\'{}\':'
            end = ''
        elif event == 'string':
            mstr = '\'{}\','
        else:
            if event == 'boolean':
                value = str(value).lower()
            mstr = '{}'
        padding = ''
        if self.pretty and previous != 'map_key':
            if len(prefix) > 0:
                padding = ''.join(['\t' for i in range(len(prefix.split('.')))])
        mstr = '{}' + mstr + end
        return mstr.format(padding, value)

    def purgeBuffer(self):
        self.buffer = ""
        self.conserveBuffer = False

    def writeBuffer(self):
        try:
            self.file.write(self.buffer)
            return self.buffer
        finally:
            self.purgeBuffer()

    def startBuffering(self):
        self.buffering = True

    def endBuffering(self):
        self.buffering = False
        if self.conserveBuffer:
            self.conserveBuffer = False
            return self.writeBuffer()
        else :
            self.purgeBuffer()
        return ""



class VidjilParser(object):

    def __init__(self, writer=None):
        if writer is not None:
            self._writer = writer
        else:
            self._writer = VidjilWriter('out.json')
        self._model_prefixes = []
        self.prefixes = ['clones.item.seg.affectSigns']

    def initModel(self, model_path):
        with open(model_path, 'r') as model:
            parser = ijson.parse(model)
            for prefix, event, value in parser:
                if (prefix, event) not in self._model_prefixes:
                    self._model_prefixes.append((prefix, event))

    def validate(self, filepath):
        with open(filepath, 'r') as vfile:
            parser = ijson.parse(vfile)
            model = list(self._model_prefixes)
            for prefix, event, value in parser:
                pair = (prefix, event)
                if pair in model:
                    model.remove(pair)
            return len(model) == 0

    def writer(self):
        return self._writer

    def addPrefix(self, prefix):
        self.prefixes.append(prefix)

    def extract(self, filepath):
        vidjilfile = open(filepath, 'r')
        parser = ijson.parse(vidjilfile)
        with self.writer() as writer:
            return self._extract(parser, writer)

    def _extract(self, parser, writer):
        previous = ''
        res = ""
        for prefix, event, value in parser:
            #There must be a better way !!!
            cond = any(prefix.startswith(item) for item in self.prefixes) \
                    or (any(item.startswith(prefix) for item in self.prefixes) \
                        and (value is None \
                            or any(item.startswith(prefix + '.' + str(value)) for item in self.prefixes) \
                                or any(item.startswith(str(value)) for item in self.prefixes)))
            if cond:
                res += writer.write(prefix, event, value, previous)
        return res
