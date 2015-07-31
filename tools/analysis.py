

import json

from utils import *
from defs import *

from collections import defaultdict

class Analysis(VidjilJson):


    def __init__(self, data=None):
        self.data = data
        self.clones = {}


    def load(self, file_path):

        with open(file_path, "r") as f:
            tmp = json.load(f) # , object_hook=self.toPython)
            self.d = tmp
            self.check_version(file_path)

        self.id_lengths = defaultdict(int)
        for clone in self.d['clones']:
            self.clones[clone['id']] = clone
            self.id_lengths[len(clone['id'])] += 1


        print "%% run_t ->", self.d['samples']['producer'], self.d['samples']['run_timestamp'], self.d['samples']['commandline']
        print "%% lengths ->", self.id_lengths

    def missing_clones(self, lw):
        '''Return a set of the clones described in this .analysis but not present into the .vidjil'''
        my_clones = set(self.clones.keys())
        lw_clones = set([c.d['id'] for c in lw])
        return my_clones.difference(lw_clones)


    def cluster_stats(self, point=0):
        for cluster in self.d['clusters']:
            sizes = []
            for c in cluster:
                try:
                    s = self.data[c].d["reads"][point]
                    sizes += [s]
                except AttributeError:
                    print "!! missing from cluster", c

            if sizes:
                print "%% cluster: max is %.3f of the sum, len %d" % (float(max(sizes)) / float(sum(sizes)), len(sizes))


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

