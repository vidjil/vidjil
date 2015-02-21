#!/usr/bin/env python
# -*- coding: utf-8 -*-

### fuse.py - Vidjil utility to parse and regroup list of clones of different timepoints or origins

#  This file is part of Vidjil <http://www.vidjil.org>,
#  High-throughput Analysis of V(D)J Immune Repertoire.
#  Copyright (C) 2011, 2012, 2013, 2014, 2015 by Bonsai bioinformatics 
#  at CRIStAL (UMR CNRS 9189, Université Lille) and Inria Lille
#  Contributors: 
#      Marc Duez <marc.duez@vidjil.org>
#      Mathieu Giraud <mathieu.giraud@vidjil.org>
#      The Vidjil Team <contact@vidjil.org>
#
#  "Vidjil" is free software: you can redistribute it and/or modify
#  it under the terms of the GNU General Public License as published by
#  the Free Software Foundation, either version 3 of the License, or
#  (at your option) any later version.
#
#  "Vidjil" is distributed in the hope that it will be useful,
#  but WITHOUT ANY WARRANTY; without even the implied warranty of
#  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#  GNU General Public License for more details.
#
#  You should have received a copy of the GNU General Public License
#  along with "Vidjil". If not, see <http://www.gnu.org/licenses/>

import json
import argparse
import sys
import time
import copy
import os.path
import datetime
from operator import itemgetter
from utils import *

VIDJIL_JSON_VERSION = "2014.10"
FUSE_VERSION = "vidjil fuse"

GERMLINES_ORDER = ['TRA', 'TRB', 'TRG', 'TRD', 'DD', 'IGH', 'DHJH', 'IJK', 'IJL'] 

####

class Window:
    # Should be renamed "Clone"
    '''storage class for sequence informations
    with some function to group sequence informations
    
    >>> str(w1)
    '<window : [5] 3 aaa>'
    
    >>> str(w3)
    '<window : [8] 4 aaa>'
    
    >>> str(w1 + w3)
    '<window : [5, 8] 3 aaa>'
    
    
    check if other information are conserved
    
    >>> (w2 + w4).d["test"]
    [0, 'plop']
    
    '''
    
    ### init Window with the minimum data required
    def __init__(self, size):
        self.d={}
        self.d["id"] = ""
        self.d["top"] = sys.maxint
        self.d["reads"] = []
        for i in range(size):
            self.d["reads"].append(0)
        
        
    ### 
    def __iadd__(self, other):
        ### Not used now
        """Add other.reads to self.reads in-place, without extending lists"""

        assert(len(self.d['reads']) == len(other.d['reads']))
        self.d['reads'] = [my + her for (my, her) in zip(self.d['reads'], other.d['reads'])]

        return self
        
    def __add__(self, other):
        """Concat two windows, extending lists such as 'reads'"""
        #data we don't need to duplicate
        myList = [ "seg", "top", "id", "sequence", "name", "id", "stats", "germline"]
        obj = Window(1)
        
        concatenate_with_padding(obj.d,
                                 self.d, len(self.d["reads"]),
                                 other.d, len(other.d["reads"]),
                                 myList)
                    
        #keep other data who don't need to be concat
        if other.d["top"] < self.d["top"] :
            for key in other.d :
                if key in myList :
                    obj.d[key] = other.d[key]
        else :
            for key in self.d :
                if key in myList :
                    obj.d[key] = self.d[key]
        
        return obj
        
    def latex(self, point=0, base=10000):
        reads = self.d["reads"][point]
        ratio = float(reads)/base
        return r"   &   & %7d & %5.2f%% & %-50s \\ %% %s" % (reads, ratio * 100, 
                                                           self.d["name"] if 'name' in self.d else self.d["id"], self.d["id"])

    ### print essential info about Window
    def __str__(self):
        return "<window : %s %s %s>" % ( self.d["reads"], '*' if self.d["top"] == sys.maxint else self.d["top"], self.d["id"])
        
class Samples: 

    def __init__(self):
        self.d={}
        self.d["number"] = 1
        self.d["original_names"] = [""]

    def __add__(self, other):
        obj=Samples()

        concatenate_with_padding(obj.d, 
                                 self.d, self.d['number'], 
                                 other.d, other.d['number'],
                                 ['number'])

        obj.d["number"] =  int(self.d["number"]) + int(other.d["number"])
        
        return obj

    def __str__(self):
        return "<Samples: %s>" % self.d

class Reads: 

    def __init__(self):
        self.d={}
        self.d["total"] = ["0"]
        self.d["segmented"] = ["0"]
        self.d["germline"] = {}

    def __add__(self, other):
        obj=Reads()

        concatenate_with_padding(obj.d['germline'], 
                                 self.d['germline'], len(self.d['total']),
                                 other.d['germline'], len(other.d['total']),
                                 ['total'])
                
        obj.d["total"] = self.d["total"] + other.d["total"]
        obj.d["segmented"] = self.d["segmented"] + other.d["segmented"]
        return obj

    def __str__(self):
        return "<Reads: %s>" % self.d
        
class OtherWindows:
    
    """Aggregate counts of windows that are discarded (due to too small 'top') for each point into several 'others-' windows."""

    def __init__(self, length, ranges = [1000, 100, 10, 1]):
        self.ranges = ranges
        self.length = length
        self.sizes = {}

        for r in self.ranges:
            self.sizes[r] = [0 for i in range(self.length)]


    def __iadd__(self, window):
        """Add to self a window. The different points may land into different 'others-' windows."""

        for i, s in enumerate(window.d["reads"]):
            for r in self.ranges:
                if s >= r:
                     break
            self.sizes[r][i] += s
            ## TODO: add seg_stat
            
        # print window, '-->', self.sizes
        return self

    def __iter__(self):
        """Yield the 'others-' windows"""

        for r in self.ranges:
            w = Window(self.length)
            w.d['reads'] = self.sizes[r]
            w.d['window'] = 'others-%d' % r
            w.d['top'] = 0

            print '  --[others]-->', w
            yield w
        
class ListWindows:
    '''storage class for sequences informations 
    
    >>> lw1.info()
    <ListWindows: [25] 2>
    <window : [5] 3 aaa>
    <window : [12] 2 bbb>
    
    >>> lw2.info()
    <ListWindows: [34] 2>
    <window : [8] 4 aaa>
    <window : [2] 8 ccc>
    
    >>> lw3 = lw1 + lw2
    >>> lw3.info()
    <ListWindows: [25, 34] 3>
    <window : [12, 0] 2 bbb>
    <window : [5, 8] 3 aaa>
    <window : [0, 2] 8 ccc>
    
    '''
    
    def __init__(self):
        '''init ListWindows with the minimum data required'''
        self.d={}
        self.d["samples"] = Samples()
        self.d["reads"] = Reads()
        self.d["clones"] = []
        self.d["clusters"] = []
        self.d["germlines"] = {}
        
        self.d["vidjil_json_version"] = VIDJIL_JSON_VERSION
        self.d["producer"] = FUSE_VERSION
        self.d["timestamp"] = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
    def __str__(self):
        return "<ListWindows: %s %d>" % ( self.d["reads"].d["segmented"], len(self) )

    # Iterator and access functions
    def __iter__(self):
        return self.d["clones"].__iter__()

    def __getitem__(self, i):
        ### not efficient !
        for clone in self:
            if clone.d["id"] == i:
                return clone

    def __len__(self):
        return len(self.d["clones"])

    ### print info about each Windows stored 
    def info(self):
        print self
        for clone in self:
            print clone

    ### check vidjil_json_version
    def check_version(self, filepath):
        if "vidjil_json_version" in self.d:
            if self.d["vidjil_json_version"] <= VIDJIL_JSON_VERSION:
                return
        raise IOError ("File '%s' is too old -- please regenerate it with a newer version of Vidjil" % filepath)
        
    ### compute statistics about clones
    def build_stat(self):
        ranges = [1000, 100, 10, 1]
        result = [[0 for col in range(len(self.d['reads'].d["segmented"]))] for row in range(len(ranges))]

        for clone in self:
            for i, s in enumerate(clone.d["reads"]):
                for r in range(len(ranges)):
                    if s >= ranges[r]:
                        break 
                result[r][i] += s
                
        print result
        for r in range(len(ranges)):
            self.d["reads-distribution-"+str(ranges[r])] = result[r]
            
        #TODO V/D/J distrib and more 
        
        
    ### save / load to .json
    def save_json(self, output):
        '''save ListWindows in .json format''' 
        print "==>", output
        with open(output, "w") as file:
            json.dump(self, file, indent=2, default=self.toJson)
            
    def load(self, file_path, pipeline, verbose=True):
        '''init listWindows with data file
        Detects and selects the parser according to the file extension.'''

        # name = file_path.split("/")[-1]
        extension = file_path.split('.')[-1]

        if verbose:
            print "<==", file_path, "\t",
        
        try:
        
            with open(file_path, "r") as file:
                tmp = json.load(file, object_hook=self.toPython)     
                self.d=tmp.d
                self.check_version(file_path)
        
        except Exception: 
            self.load_clntab(file_path)
        pass
        
        if pipeline: 
            # renaming, private pipeline
            f = '/'.join(file_path.split('/')[2:-1])
            if verbose:
                print "[%s]" % f

        else:
            f = file_path
            if verbose:
                print
        
        time = os.path.getmtime(file_path)
        self.d["samples"].d["timestamp"] = [datetime.datetime.fromtimestamp(time).strftime("%Y-%m-%d %H:%M:%S")]

    def getTop(self, top):
        result = []
        
        for clone in self:
            if clone.d["top"] <= top :
                result.append(clone.d["id"])
        return result
        
    def filter(self, f):
        r = []
        
        reverseList = {}
        for i,w in enumerate(self.d["clones"]) :
            reverseList[w.d["id"]] = i
        
        #filteredList = { k: reverseList[k] for k in f }
        filteredList = dict(filter(lambda t: t[0] in f, reverseList.items()))
        
        for i in filteredList:
            r.append(self.d["clones"][filteredList[i]])
        
        self.d["clones"] = r
        
    ### 
    def __add__(self, other): 
        '''Combine two ListWindows into a unique ListWindows'''
        obj = ListWindows()
        l1 = len(self.d["reads"].d['segmented'])
        l2 = len(other.d["reads"].d['segmented'])

        concatenate_with_padding(obj.d, 
                                 self.d, l1,
                                 other.d, l2,
                                 ["clones", "links", "germlines",
                                  "vidjil_json_version"])
        
        obj.d["clones"]=self.fuseWindows(self.d["clones"], other.d["clones"], l1, l2)
        obj.d["samples"] = self.d["samples"] + other.d["samples"]
        obj.d["reads"] = self.d["reads"] + other.d["reads"]
        obj.d["germlines"] = dict(self.d["germlines"].items() + other.d["germlines"].items())
        
        return obj
        
    ###
    def __mul__(self, other):
        
        for i in range(len(self.d["reads_segmented"])):
            self.d["reads_segmented"][i] += other.d["reads_segmented"][i] 
        
        self.d["clones"] += other.d["clones"]
        self.d["vidjil_json_version"] = [VIDJIL_JSON_VERSION]
        
        self.d["system_segmented"].update(other.d["system_segmented"])
        
        return self
        
    ### 
    def fuseWindows(self, w1, w2, l1, l2) :
        #store data in dict with "id" as key
        dico1 = {}
        for i in range(len(w1)) :
            dico1[ w1[i].d["id"] ] = w1[i]

        dico2 = {}
        for i in range(len(w2)) :
            dico2[ w2[i].d["id"] ] = w2[i]

        #concat data with the same key ("id")
        #if some data are missing we concat with an empty Windows()
        dico3 = {}
        for key in dico1 :
            if key in dico2 :
                dico3[key] = dico1[key] + dico2[key]
            else :
                w=Window(l2)
                dico3[key] = dico1[key] + w

        for key in dico2 :
            if key not in dico1 :
                w=Window(l1)
                dico3[key] = w + dico2[key]
        
        
        #sort by top
        tab = []
        for key in dico3 :
            tab.append((dico3[key], dico3[key].d["top"]))
        tab = sorted(tab, key=itemgetter(1))
        
        #store back in a List
        result=[]
        for i in range(len(tab)) :
            result.append(tab[i][0])
        
        return result
        
    
    def cut(self, limit, nb_points):
        '''Remove information from sequence/windows who never enter in the most represented sequences. Put this information in 'other' windows.'''

        length = len(self)
        w=[]

        others = OtherWindows(nb_points)

        for clone in self:
            if (int(clone.d["top"]) < limit or limit == 0) :
                w.append(clone)
            #else:
                #others += clone

        self.d["clones"] = w #+ list(others) 

        print "### Cut merged file, keeping window in the top %d for at least one point" % limit
        return self
        
    def load_clntab(self, file_path):
        '''Parser for .clntab file'''

        self.d["vidjil_json_version"] = [VIDJIL_JSON_VERSION]
        self.d["samples"].d["original_names"] = [file_path]
        self.d["samples"].d["producer"] = ["EC-NGS central pipeline"]
        
        listw = []
        listc = []
        total_size = 0
        
        fichier = open(file_path,"r")
        for ligne in fichier:
            if "clonotype" in ligne:
                header_map = ligne.replace('\n', '').split('\t')
            else :
                tab = AccessedDict()
                for index, data in enumerate(ligne.split('\t')):
                    tab[header_map[index]] = data
                        
                w=Window(1)
                w.d["seg"] = {}
                
                #w.window=tab["sequence.seq id"] #use sequence id as window for .clntab data
                w.d["id"]=tab["sequence.raw nt seq"] #use sequence as window for .clntab data
                s = int(tab["sequence.size"])
                total_size += s
                w.d["reads"] = [ s ]

                w.d["germline"] = tab["sequence.V-GENE and allele"][:3] #system ...
                
                w.d["sequence"] = tab["sequence.raw nt seq"]
                w.d["seg"]["5"]=tab["sequence.V-GENE and allele"].split('=')[0]
                if (tab["sequence.D-GENE and allele"] != "") :
                    w.d["seg"]["4"]=tab["sequence.D-GENE and allele"].split('=')[0]
                w.d["seg"]["3"]=tab["sequence.J-GENE and allele"].split('=')[0]

                # use sequence.JUNCTION to colorize output (this is not exactly V/J !)
                junction = tab.get("sequence.JUNCTION.raw nt seq")
                position = w.d["sequence"].find(junction)
                
                if position >= 0:
                    w.d["seg"]["3start"] = position + len(junction)
                    w.d["seg"]["5end"] = position 
                else:
                    w.d["seg"]["3start"] = 0
                    w.d["seg"]["5end"] = len(w.d["sequence"])
                w.d["seg"]["3end"]=0
                w.d["seg"]["5start"]=0
                w.d["seg"]["4end"]=0
                w.d["seg"]["4start"]=0
                w.d["seg"]["cdr3"] = tab["sequence.JUNCTION.raw nt seq"][3:-3]
                    
                listw.append((w , w.d["reads"][0]))

                raw_clonotype = tab.get("clonotype")
                w.d["name"]=raw_clonotype # w.d["seg"]["5"] + " -x/y/-z " + w.d["seg"]["3"]

                clonotype = raw_clonotype.split(' ')
                if (len(clonotype) > 1) :
                    listc.append((w, raw_clonotype))
                
                #keep data that has not already been stored
                for header in tab.not_accessed_keys():
                    w.d["_"+header] = [tab[header]]

        #sort by sequence_size
        listw = sorted(listw, key=itemgetter(1), reverse=True)
        #sort by clonotype
        listc = sorted(listc, key=itemgetter(1))
        
        #generate data "top"
        for index in range(len(listw)):
            listw[index][0].d["top"]=index+1
            self.d["clones"].append(listw[index][0])
        
        self.d["reads"].d["segmented"] = [total_size]
        self.d["reads"].d["total"] = [total_size]

        
    def toJson(self, obj):
        '''Serializer for json module'''
        if isinstance(obj, ListWindows) or isinstance(obj, Window) or isinstance(obj, Samples) or isinstance(obj, Reads):
            result = {}
            for key in obj.d :
                result[key]= obj.d[key]
                
            return result
            raise TypeError(repr(obj) + " fail !") 
        
        else:
            result = {}
            for key in obj :
                result[key]= obj[key]
            
            return result
            raise TypeError(repr(obj) + " fail !") 

    def toPython(self, obj_dict):
        '''Reverse serializer for json module'''
        if "samples" in obj_dict:
            obj = ListWindows()
            obj.d=obj_dict
            return obj

        if "id" in obj_dict:
            obj = Window(1)
            obj.d=obj_dict
            return obj
        
        if "total" in obj_dict:
            obj = Reads()
            obj.d=obj_dict
            return obj
            
        if "original_names" in obj_dict:
            obj = Samples()
            obj.d=obj_dict
            return obj
            
        return obj_dict
        



### some data used for test
w1 = Window(1)
w1.d ={"id" : "aaa", "reads" : [5], "top" : 3 }
w2 = Window(1)
w2.d ={"id" : "bbb", "reads" : [12], "top" : 2 }
w3 = Window(1)
w3.d ={"id" : "aaa", "reads" : [8], "top" : 4 }
w4 = Window(1)
w4.d ={"id" : "ccc", "reads" : [2], "top" : 8, "test" : ["plop"] }


w5 = Window(1)
w5.d ={"id" : "aaa", "reads" : [5], "top" : 3 }
w6 = Window(1)
w6.d ={"id" : "bbb", "reads" : [12], "top" : 2 }

lw1 = ListWindows()
lw1.d["timestamp"] = 'ts'
lw1.d["reads"] = json.loads('{"total": [30], "segmented": [25], "germline": {} }', object_hook=lw1.toPython)
lw1.d["clones"].append(w5)
lw1.d["clones"].append(w6)

w7 = Window(1)
w7.d ={"id" : "aaa", "reads" : [8], "top" : 4 }
w8 = Window(1)
w8.d ={"id" : "ccc", "reads" : [2], "top" : 8, "test" : ["plop"] }

lw2 = ListWindows()
lw2.d["timestamp"] = 'ts'
lw2.d["reads"] = json.loads('{"total": [40], "segmented": [34], "germline": {} }', object_hook=lw1.toPython)
lw2.d["clones"].append(w7)
lw2.d["clones"].append(w8)

    
    

 
def main():
    print "#", ' '.join(sys.argv)

    DESCRIPTION = 'Vidjil utility to parse and regroup list of clones of different timepoints or origins'
    
    #### Argument parser (argparse)

    parser = argparse.ArgumentParser(description= DESCRIPTION,
                                    epilog='''Example:
  python2 %(prog)s --germline IGH out/Diag/vidjil.data out/MRD-1/vidjil.data out/MRD-2/vidjil.data''',
                                    formatter_class=argparse.RawTextHelpFormatter)


    group_options = parser.add_argument_group() # title='Options and parameters')

    group_options.add_argument('--test', action='store_true', help='run self-tests')
    group_options.add_argument('--multi', action='store_true', help='merge different systems from a same timepoint (deprecated, do not use)')
    
    group_options.add_argument('--compress', '-c', action='store_true', help='compress point names, removing common substrings')
    group_options.add_argument('--pipeline', '-p', action='store_true', help='compress point names (internal Bonsai pipeline)')

    group_options.add_argument('--output', '-o', type=str, default='fused.vidjil', help='output file (%(default)s)')
    group_options.add_argument('--top', '-t', type=int, default=50, help='keep only clones in the top TOP of some point (%(default)s)')

    parser.add_argument('file', nargs='+', help='''input files (.vidjil/.cnltab)''')
  
    args = parser.parse_args()
    # print args

    if args.test:
        import doctest
        doctest.testmod(verbose = True)
        sys.exit(0)

    jlist_fused = None

    print "### fuse.py -- " + DESCRIPTION
    print

    #filtre
    f = []
    for path_name in args.file:
        jlist = ListWindows()
        jlist.load(path_name, args.pipeline)
        f += jlist.getTop(args.top)
    f = sorted(set(f))
    
    if args.multi:
        for path_name in args.file:
            jlist = ListWindows()
            jlist.load(path_name, args.pipeline)
            jlist.build_stat()
            
            print "\t", jlist,

            if jlist_fused is None:
                jlist_fused = jlist
            else:
                jlist_fused = jlist_fused * jlist
                
            print '\t==> merge to', jlist_fused
        jlist_fused.d["system_segmented"] = ordered(jlist_fused.d["system_segmented"], key=lambda sys: ((GERMLINES_ORDER + [sys]).index(sys), sys))
        
    else:
        print "### Read and merge input files"
        for path_name in args.file:
            jlist = ListWindows()
            jlist.load(path_name, args.pipeline)
            jlist.build_stat()
            jlist.filter(f)

            w1 = Window(1)
            w2 = Window(2)
            w3 = w1+w2
            
            print "\t", jlist,
            # Merge lists
            if jlist_fused is None:
                jlist_fused = jlist
            else:
                jlist_fused = jlist_fused + jlist
            
            print '\t==> merge to', jlist_fused

    if args.compress:
        print
        print "### Select point names"
        l = jlist_fused.d["samples"].d["original_names"]
        ll = interesting_substrings(l)
        print "  <==", l
        print "  ==>", ll
        jlist_fused.d["samples"].d["names"] = ll
    
    print
    if not args.multi:
        jlist_fused.cut(args.top, jlist_fused.d["samples"].d["number"])
    print "\t", jlist_fused 
    print

    print "### Save merged file"
    jlist_fused.save_json(args.output)

    
    
if  __name__ =='__main__':
    main()
