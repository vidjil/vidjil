#!/usr/bin/python
import ijson

class VidjilWriter(object):

    def __init__(self, filepath, pretty=False):
        self._filepath = filepath
        self.pretty = pretty

    def __enter__(self):
        self.file = open(self._filepath, 'w')
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        self.file.close()

    def write(self, prefix, event, value, previous):
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
            mstr = '{},'
        padding = ''
        if self.pretty and previous_event != 'map_key':
            if len(prefix) > 0:
                padding = ''.join(['\t' for i in range(len(prefix.split('.')))])
        mstr = '{}' + mstr + end
        self.file.write(mstr.format(padding, value))


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
            self._extract(parser, writer)

    def _extract(self, parser, writer):
        previous = ''
        for prefix, event, value in parser:
            #There must be a better way !!!
            cond = any(prefix.startswith(item) for item in self.prefixes) \
                    or (any(item.startswith(prefix) for item in self.prefixes) \
                        and (value is None \
                            or any(item.startswith(prefix + '.' + str(value)) for item in self.prefixes) \
                                or any(item.startswith(str(value)) for item in self.prefixes)))
            if cond:
                writer.write(prefix, event, value, previous)
