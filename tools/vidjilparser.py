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
            mstr = '}}'
        elif event == 'start_array':
            mstr = '['
        elif event == 'end_array':
            mstr = ']'
        elif event == 'map_key':
            mstr = '\"{}\":'
            end = ''
        elif event == 'string':
            mstr = '\"{}\"'
        else:
            if event == 'boolean':
                value = str(value).lower()
            mstr = '{}'
        padding = ''
        if type(value) in [str, unicode] :
            value = value.replace("\n", "\\n")
            value = value.replace("\r", "\\r")
        if previous not in ['', 'map_key', 'start_map', 'start_array'] and event not in ['end_map', 'end_array']:
            mstr = "," + mstr
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

class Predicate(object):

    def __init__(self, field, comparator, value):
        self.comp = comparator
        self.field = field
        self.value = value

    def compare(self, field, other):
        if self.comp is None:
            return True
        try:
            return field == self. field and self.comp(other, self.value)
        except:
            return False


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

    def addPrefix(self, prefix, conditional = None, comp = None, value = None):
        self.prefixes.append((prefix, Predicate(conditional, comp, value)))

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
            cond = any(prefix.startswith(item[0]) for item in self.prefixes) \
                    or (any(item[0].startswith(prefix) for item in self.prefixes) \
                        and (value is None \
                            or any(item[0].startswith(prefix + '.' + str(value)) for item in self.prefixes) \
                                or any(item[0].startswith(str(value)) for item in self.prefixes)))
            if cond:
                if not self._writer.conserveBuffer \
                        and any((item[1].compare(prefix, value)) for item in self.prefixes):
                    self._writer.conserveBuffer = True

                bufferOn = any(prefix == item[0] or prefix == item[0]+'.item' for item in self.prefixes)
                if bufferOn and event == "start_map":
                    self._writer.startBuffering()

                res += writer.write(prefix, event, value, previous)

                if bufferOn and event == "end_map":
                    res += self._writer.endBuffering()
                previous = event
        return res
