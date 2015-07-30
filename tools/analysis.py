

import json

from utils import *
from defs import *

class Analysis(VidjilJson):


    def __init__(self):
        self.clones = {}


    def load(self, file_path):

        with open(file_path, "r") as f:
            tmp = json.load(f) # , object_hook=self.toPython)
            self.d = tmp
            self.check_version(file_path)

        for clone in self.d['clones']:
            self.clones[clone['id']] = clone

    def info_of_clone(self, w):
        if w.d['id'] in self.clones:
            return self.clones[w.d['id']]
        return None

    def tag_of_clone(self, w):
        i = self.info_of_clone(w)
        if i:
            try:
                return i['tag']
            except:
                return None
        return None

