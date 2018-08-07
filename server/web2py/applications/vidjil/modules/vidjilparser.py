#!/usr/bin/python
import ijson.backends.yajl2_cffi as ijson
from six import string_types
from enum import Enum

class MatchingEvent(Enum):
    end_map = "start_map"
    end_array = "start_array"

class VidjilWriter(object):

    def __init__(self, pretty=False):
        self.pretty = pretty
        self.buffer = []
        self.buffering = False
        self.conserveBuffer = False

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        pass

    def write(self, prefix, event, value, previous):
        res = self._write(prefix, event, value, previous)
        if self.buffering:
            self.buffer.append(res)
            return ""
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
        if isinstance(value, string_types) :
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
        self.buffer = []
        self.conserveBuffer = False

    def writeBuffer(self):
        try:
            return ''.join(self.buffer)
        finally:
            self.purgeBuffer()

    def startBuffering(self):
        self.conserveBuffer = False
        self.buffering = True

    def endBuffering(self):
        self.buffering = False
        if self.conserveBuffer:
            self.conserveBuffer = False
            return self.writeBuffer()
        else :
            self.purgeBuffer()
        return ""

class VidjilFileWriter(VidjilWriter):

    def __init__(self, filepath=None, pretty=False):
        super(VidjilWriter, self).__init__()
        self._filepath = filepath
        self.file = None

    def __enter__(self):
        self.file = open(self._filepath, 'wb')
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        self.file.close()

    def write(self, prefix, event, value, previous):
        res = super(VidjilWriter, self).write(prefix, event, value, previous)
        self.file.write(res)
        return res

    def writeBuffer(self):
        res = super(VidjilWriter, self).writeBuffer()
        self.file.write(res)
        return res

class Predicate(object):

    def __init__(self, field, comparator, value):
        self.comp = comparator
        self.field = field
        self.value = value

    def compare(self, field, other):
        if self.comp is None:
            return field == self.field
        try:
            res = field == self.field and self.comp(other, self.value)
            return res
        except:
            return False


class VidjilParser(object):

    def __init__(self, writer=None):
        if writer is not None:
            self._writer = writer
        else:
            self._writer = VidjilWriter()
        self._model_prefixes = []
        self.prefixes = []

    def initModel(self, model_path):
        with open(model_path, 'rb') as model:
            parser = ijson.parse(model)
            for prefix, event, value in parser:
                if (prefix, event) not in self._model_prefixes:
                    self._model_prefixes.append((prefix, event))

    def validate(self, filepath):
        with open(filepath, 'rb') as vfile:
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
        if conditional is None:
            conditional = prefix
        self.prefixes.append((prefix, Predicate(conditional, comp, value)))

    def reset(self):
        self.prefixes = []
        self._writer.purgeBuffer()

    def extract(self, filepath):
        vidjilfile = open(filepath, 'rb')
        parser = ijson.parse(vidjilfile)
        with self.writer() as writer:
            return self._extract(parser, writer)

    def isStartEvent(self, event):
        return event in ['start_map', 'start_array']

    def isEndEvent(self, event):
        return event in ['end_map', 'end_array', 'number', 'string', 'boolean']

    def isMatching(self, mbuffer, other):
        if other[1] not in MatchingEvent.__members__:
            return False
        return (mbuffer[0] == other[0]) and (mbuffer[1] == MatchingEvent[other[1]].value)

    def _extract(self, parser, writer):
        previous = ''
        res = ""
        bufferStart = (None, None)
        for prefix, event, value in parser:
            subelem = lambda x, y: x.startswith(y)
            if any(subelem(prefix, item[0])\
                    or (subelem(item[0], prefix) and (value is None or subelem(item[0], str(value))))\
                    for item in self.prefixes):

                bufferOn = any(prefix == item[0] for item in self.prefixes) and self.isStartEvent(event)
                if bufferOn:
                    bufferStart = (prefix, event)
                    saved_previous = previous
                    self._writer.startBuffering()

                if not self._writer.conserveBuffer \
                        and any((item[1].compare(prefix, value)) for item in self.prefixes):
                    self._writer.conserveBuffer = True

                res += writer.write(prefix, event, value, previous)

                previous = event
                if (self.writer().buffering and (self.isEndEvent(event) and self.isMatching(bufferStart, (prefix, event)) or self._writer.conserveBuffer)):
                    if not self._writer.conserveBuffer:
                        previous = saved_previous
                    res += self._writer.endBuffering()
        return res
