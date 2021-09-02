#!/usr/bin/env python3
# -*- coding: utf-8 -*-

### fuse.py - Vidjil utility to parse and regroup list of clones of different timepoints or origins

#  This file is part of Vidjil <http://www.vidjil.org>,
#  High-throughput Analysis of V(D)J Immune Repertoire.
#  Copyright (C) 2011-2017 by Bonsai bioinformatics
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

from __future__ import print_function
from __future__ import division

import check_python_version
import sys
import json
import argparse
import os.path
import os
import datetime
import subprocess
import tempfile
import math
import gzip
from operator import itemgetter, le
from utils import *
from defs import *
from collections import defaultdict
from pipes import quote

FUSE_VERSION = "vidjil fuse"

TOOL_SIMILARITY = "../algo/tools/similarity"
SIMILARITY_LIMIT = 100

GERMLINES_ORDER = ['TRA', 'TRB', 'TRG', 'TRD', 'DD', 'IGH', 'DHJH', 'IJK', 'IJL'] 

AVAILABLE_AXES = [
    "top", "germline", "name",
    "seg5", "seg4", "seg4a", "seg4b", "seg3",
    "evalue", "lenSeqAverage", "lenCDR3", "lenJunction",
    "seg5_delRight", "seg3_delLeft", "seg4_delRight", "seg4_delLeft",
    "seg5_stop", "seg3_start", "seg4_stop", "seg4_start", "cdr3_stop", "cdr3_start",
    "junction_stop", "junction_start", "productive",
    "insert_53", "insert_54", "insert_43",
    "evalue", "evalue_left", "evalue_right",
]
GET_UNKNOW_AXIS = "unknow_axis"
UNKNOWN_VALUE   = ""

def generic_open(path, mode='r', verbose=False):
    '''
    Open a file.
    If 'r', possibly open .gz compressed files.
    '''
    if verbose:
        print(" <==", path, "\t", end=' ')

    if 'r' in mode:
        try:
            f = gzip.open(path, mode)
            f.read(1)
            f.seek(0)
            return f
        except IOError:
            pass

    return open(path, mode)

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
    
    >>> w1.get_values("name")
    '?'
    
    >>> w1.get_values("top")
    3
  
    >>> w7   = Window(1)
    >>> w7.d = seg_w7
    >>> w7.d["seg"]["5"]["name"]
    'TRAV17*01'

    >>> w7.get_values("reads")
    16

    >>> w7.get_values("top")
    26
    >>> w7.get_values("germline")
    'TRA'
    >>> w7.get_values("name")
    'TRAV17*01 0/CCGGGG/5 TRAJ40*01'
    >>> w7.get_values("seg5")
    'TRAV17*01'
    >>> w7.get_values("seg4a")
    '?'
    >>> w7.get_values("seg4")
    '?'
    >>> w7.get_values("seg4b")
    '?'
    >>> w7.get_values("seg3")
    'TRAJ40*01'
    >>> w7.get_values("evalue")
    '1.180765e-43'
    >>> w7.get_values("evalue_left")
    '1.296443e-47'
    >>> w7.get_values("evalue_right")
    '1.180635e-43'
    >>> w7.get_values("seg5_delRight")
    0
    >>> w7.get_values("seg3_delLeft")
    5
    >>> w7.get_values("seg4_delRight")
    '?'
    >>> w7.get_values("seg4_delLeft")
    '?'
    >>> w7.get_values("seg5_stop")
    105
    >>> w7.get_values("seg3_start")
    112
    >>> w7.get_values("seg4_stop")
    '?'
    >>> w7.get_values("seg4_start")
    '?'
    >>> w7.get_values("cdr3_start")
    96
    >>> w7.get_values("cdr3_stop")
    133
    >>> w7.get_values("junction_start")
    93
    >>> w7.get_values("junction_stop")
    136
    >>> w7.get_values("productive")
    True
    >>> w7.get_values("unavailable_axis")
    'unknow_axis'
    >>> w7.get_values("lenSeqAverage")
    168.0
    >>> w7.get_values("lenSeqAverage", 0)
    168.0
    >>> w7.get_values("lenSeqAverage", 1)
    169.0
    '''


    ### init Window with the minimum data required
    def __init__(self, size):
        self.d={}
        self.d["id"] = ""
        self.d["top"] = sys.maxsize
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
        myList = [ "seg", "top", "id", "sequence", "name", "id", "stats", "germline", "mrd"]
        obj = Window(1)
        
        # 'id' and 'top' will be taken from 'topmost' clone
        del obj.d["id"]
        del obj.d["top"]

        # Data of type 'list'
        concatenate_with_padding(obj.d,
                                 self.d, len(self.d["reads"]),
                                 other.d, len(other.d["reads"]),
                                 myList)
        # MRD data, only if none is empty
        # TODO: Make this more generic to work with any MRD setup
        zeroed = {"copy_number": [0],
                  "R2": [0],
                  "family": ["None"],
                   "norm_coeff": [0]}
        if "mrd" in self.d or "mrd" in other.d:
            if "mrd" in self.d:
                first = self.d["mrd"]
            else:
                first = zeroed
                for key in first.keys():
                    first[key] = first[key] * len(self.d["reads"])

            if "mrd" in other.d:
                second = other.d["mrd"]
            else:
                second = zeroed
                for key in second.keys():
                    second[key] = second[key] * len(other.d["reads"])

            obj.d["mrd"] = {}
            concatenate_with_padding(obj.d["mrd"],
                                     first, len(self.d["reads"]),
                                     second, len(other.d["reads"]))
                        
        # All other data, including 'top'
        # When there are conflicting keys, keep data from the 'topmost' clone
        order = [other, self] if other.d["top"] < self.d["top"] else [self, other]

        for source in order:
            for key in source.d:
                if key not in obj.d:
                    obj.d[key] = source.d[key]

        # !! No name field if fuse with an empty clone
        if "name" in self.d and "name" in other.d and self.d["name"] != other.d["name"]:
            if obj.d["name"] == self.d["name"]:
                name = other.d["name"]
            else:
                name = self.d["name"]

            msg = "Merged clone has different V(D)J designations in some samples (pos %s): %s" % (len(self.d["reads"]), name)
            obj.addWarning(code="W81", msg=msg, level="warn")

        # !! No name field if fuse with an empty clone
        # !! If imported from airr, junction is present but empty
        if ("seg" in self.d and "junction" in self.d["seg"]) and ("seg" in other.d and "junction" in other.d["seg"])\
          and ("productive" in self.d["seg"]["junction"] and "productive" in other.d["seg"]["junction"]) \
          and self.d["seg"]["junction"]["productive"] != other.d["seg"]["junction"]["productive"]:
            if obj.d["seg"]["junction"]["productive"] == self.d["seg"]["junction"]["productive"]:
                junction = other.d["seg"]["junction"]["productive"]
            else:
                junction = self.d["seg"]["junction"]["productive"]
            if junction:
                junction = "productive"
            else:
                junction = "not productive"

            # show number/position of the corresponding sample ?
            msg = "Merged clone has different productivities in some samples (pos %s): %s" % (len(self.d["reads"]), junction)
            obj.addWarning(code="W82", msg=msg, level="warn")
        return obj
        
    def addWarning(self, code, msg, level):
        # init warn field if not already present
        if not "warn" in self.d:
            self.d["warn"] = []
        self.d["warn"].append( {"code":code, "msg":msg, "level": level})
        return

    def get_nb_reads(self, cid, point=0):
        return self[cid]["reads"][point]

    def get_reads(self, t=-1):
        if t== -1:
            return self.d["reads"]
        else:
            return self.d["reads"][t]

    def is_segmented(self):
        if not "seg" in self.d.keys():
            return False
        return True


    def get_axes_values(self, axes, timepoint):
        """Return the values of given axes for this clone at a gvien timepoint"""
        values = []
        for axis in axes:
            values.append(self.get_values(axis, timepoint))
        return values


    def get_values(self, axis, timepoint=0):
        """Return the value of an axis for this clone at a given timepoint"""

        axes = {
            "id":       ["id"],
            "top":      ["top"],
            "germline": ["germline"],
            "name":     ["name"],
            "reads":    ["reads"],
            "seg5":     ["seg",  "5", "name"],
            "seg4":     ["seg",  "4", "name"],
            "seg4a":    ["seg", "4a", "name"],
            "seg4b":    ["seg", "4b", "name"],
            "seg3":     ["seg",  "3", "name"],
            "evalue":   ["seg", "evalue","val"],
            "evalue_left":   ["seg", "evalue_left","val"],
            "evalue_right":  ["seg", "evalue_right","val"],
            "seg5_delRight": ["seg","5","delRight"],
            "seg3_delLeft":  ["seg","3","delLeft"],
            "seg4_delRight": ["seg","4","delRight"],
            "seg4_delLeft":  ["seg","4","delLeft"],
            ### Positions
            "seg5_stop":  ["seg","5","stop"],
            "seg3_start": ["seg","3","start"],
            "seg4_stop":  ["seg","4","stop"],
            "seg4_start": ["seg","4","start"],
            "cdr3_stop":  ["seg","cdr3","stop"],
            "cdr3_start": ["seg","cdr3","start"],
            "junction_stop":  ["seg","junction","stop"],
            "junction_start": ["seg","junction","start"],
            "productive":     ["seg","junction","productive"],
            "lenSeqAverage" : ["_average_read_length"],
            "warnings": ["warn"],
            "sequence": ["sequence"]
        }

        ### length
        axes_length = {
            "insert_53": ["seg3_start", "seg5_stop", -1],
            "insert_54": ["seg4_start", "seg5_stop", -1],
            "insert_43": ["seg3_start", "seg4_stop", -1],
            "lenCDR3": ["cdr3_stop", "cdr3_start", 0],
            "lenJunction": ["junction_stop", "junction_start", 0]
        }

        axes_rounded = {
            "lenSeqAverage" : 1.0
        }

        try:
            if axis in axes.keys():
                path  = axes[axis]
                depth = 0
                value = self.d
                if path[0] == "seg" and not self.is_segmented():
                    return "?"

                while depth != len(path):
                    value  = value[path[depth]]
                    depth += 1
                if axis in axes_rounded.keys():
                    value = self.round_axis(value, axes_rounded[axis])


                if type(value) is list:
                    # In these cases, should be a list of value at different timepoint
                    return value[timepoint]

                return value

            return GET_UNKNOW_AXIS
        except:
            return "?"

    def round_axis(self, value, round_set):
        if isinstance(value, list):
            for i in range(len(value)):
                value[i] = self.round_axis(value[i], round_set)
        else:
            value = round(float(value) / round_set) * round_set
        return value


    def toCSV(self, cols= [], time=0, jlist = False):
        """ Return a list of values of the clone added from a list of waited columns """
        list_values = []


        airr_to_axes = {
            "locus":               "germline",
            "v_call":              "seg5",
            "d_call":              "seg4",
            "j_call":              "seg3",
            "v_alignment_end":     "seg5_stop",
            "d_alignment_start":   "seg4_start",
            "d_alignment_end":     "seg4_stop",
            "j_alignment_start":   "seg3_start",
            "productive":          "productive",
            "cdr3_start":          "cdr3_start",
            "cdr3_end":            "cdr3_stop",
            "sequence_id":         "id",
            "sequence":            "sequence",
            ## Not implemented in get_values
            # For x_cigar, datananot available in clone
            "junction":  "?",
            "cdr3_aa":   "?",
            "rev_comp":  "?",
            "v_cigar":   "?",
            "d_cigar":   "?",
            "j_cigar":   "?",
            "sequence_alignment": "?",
            "germline_alignment": "?",
            "duplicate_count":    "reads"
        }

        airr_computed =  ["ratio_segmented", "ratio_locus", "filename", "warnings"]

        for col in cols:    

            if col in airr_computed:
                if col == "ratio_locus":
                    germline = self.get_values("germline")
                    value = float(self.get_values("reads", timepoint=time) ) / jlist.d["reads"].d["germline"][germline][time]
                elif col == "ratio_segmented":
                    value = float(self.get_values("reads", timepoint=time) ) / jlist.d["reads"].d["segmented"][time]
                elif col == "filename":
                    value = jlist.d["samples"].d["original_names"][time]
                elif col == "warnings":
                    if "warn" not in self.d.keys():
                        value = ""
                    else:
                        warns = self.d["warn"]
                        values = []
                        for warn in warns:
                            values.append( warn["code"] )
                        value = ",".join(values)

                else:
                    value = GET_UNKNOW_AXIS

            elif col in airr_to_axes.keys():
                value = self.get_values(airr_to_axes[col], timepoint=time)
            else:
                value = GET_UNKNOW_AXIS

            if value == "?" or value == GET_UNKNOW_AXIS:
                # for some axis, there is no computable data; for the moment don't show anything
                value = UNKNOWN_VALUE
            list_values.append( str(value) )

        return list_values


    def latex(self, point=0, base_germline=10000, base=10000, tag=''):
        reads = self.d["reads"][point]
        ratio_germline = float(reads)/base_germline
        ratio = float(reads)/base
        return r"   &   & %7d & %5.2f\%% & of %-4s & %5.2f\%% & %-50s \\ %% %4s %s" % (reads, ratio_germline * 100, self.d['germline'], ratio * 100,
                                                                  self.d["name"] if 'name' in self.d else self.d["id"],
                                                                  tag, self.d["id"])

    ### print essential info about Window
    def __str__(self):
        return "<window : %s %s %s>" % ( self.d["reads"], '*' if self.d["top"] == sys.maxsize else self.d["top"], self.d["id"])
        
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
        
class MRD: 

    def __init__(self, number=1):
        self.d={}
        self.d["number"] = number
            
    def __add__(self, other):
        obj=MRD()

        concatenate_with_padding(obj.d, 
                                 self.d, self.d['number'], 
                                 other.d, other.d['number'],
                                 ['number'])

        obj.d["number"] =  int(self.d["number"]) + int(other.d["number"])
        
        return obj

    def __str__(self):
        return "<MRD: %s>" % self.d

class Diversity: 

    keys = ["index_H_entropy", "index_E_equitability", "index_Ds_diversity"]

    def __init__(self, data=None):
        self.d={}

        for k in self.keys:
            if data == None or not (k in data):
                self.d[k] = ["na"]
            else:
                self.d[k]= [data[k]]

    def __add__(self, other):
        for k in self.keys:
            self.d[k].append(other.d[k][0])
        return self

    def __str__(self):
        return "<Diversity: %s>" % self.d
        
class Reads: 

    def __init__(self):
        self.d={}
        self.d["total"] = [0]
        self.d["segmented"] = [0]
        self.d["germline"] = {}
        self.d['distribution'] = {}

    def __add__(self, other):
        obj=Reads()

        concatenate_with_padding(obj.d['germline'], 
                                 self.d['germline'], len(self.d['total']),
                                 other.d['germline'], len(other.d['total']),
                                 ['total'])
        concatenate_with_padding(obj.d['distribution'],
                                 self.d['distribution'], len(self.d['total']),
                                 other.d['distribution'], len(other.d['total']),
                                 ['total'])
                
        obj.d["total"] = self.d["total"] + other.d["total"]
        obj.d["segmented"] = self.d["segmented"] + other.d["segmented"]
        return obj

    def addAIRRClone(self, clone):
        """
        Allow to add a clone create by AIRR import. 
        Add reads values to germline, segmented and total section
        """
        if clone.d["germline"] not in self.d["germline"].keys():
            self.d["germline"][clone.d["germline"]] = [0]
        self.d["germline"][clone.d["germline"]][0]  += clone.d["reads"][0]
        self.d["total"][0]     += clone.d["reads"][0]
        self.d["segmented"][0] += clone.d["reads"][0]
        return

    def __str__(self):
        return "<Reads: %s>" % self.d
        
class OtherWindows:
    
    """Aggregate counts of windows that are discarded (due to too small 'top') for each point into several 'others-' windows."""

    def __init__(self, length, ranges = None):
        self.ranges = ranges if ranges is not None else [1000, 100, 10, 1]
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

            print('  --[others]-->', w)
            yield w
        
class ListWindows(VidjilJson):
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
    >>> lw3.build_stat()
    >>> lw3.d['reads'].d['distribution']['0.1']
    [17, 8]
    >>> lw3.d['reads'].d['distribution']['0.01']
    [0, 2]
    >>> lw3.d['reads'].d['distribution']['0.001']
    [0, 0]
    >>> lw3.d['reads'].d['distribution']['0.0001']
    [0, 0]

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
        print(self)
        for clone in self:
            print(clone)
        
    ### compute statistics about clones
    def build_stat(self):
        ranges = [.1, .01, .001, .0001, .00001, .000001, .0000001]
        result = [[0 for col in range(len(self.d['reads'].d["segmented"]))] for row in range(len(ranges))]

        for clone in self:
            for i, s in enumerate(clone.d["reads"]):
                if self.d['reads'].d['segmented'][i] > 0:
                    for r in range(len(ranges)):
                        if s*1. / self.d['reads'].d['segmented'][i] >= ranges[r]:
                            break
                    result[r][i] += s

        for r in range(len(ranges)):
            ratio_in_string = '{0:.10f}'.format(ranges[r]).rstrip('0')
            self.d['reads'].d['distribution'][ratio_in_string] = result[r]
            
        #TODO V/D/J distrib and more 
        
        
    ### save / load to .json
    def save_json(self, output):
        '''save ListWindows in .json format''' 
        print("==>", output)
        with open(output, "w") as f:
            json.dump(self, f, indent=2, default=self.toJson)

    def load(self, file_path, *args, **kwargs):
        if '.clntab' in file_path:
            self.load_clntab(file_path, *args, **kwargs)
        elif ".tsv" in file_path or ".AIRR" in file_path or ".airr" in file_path:
            self.load_airr(file_path, *args, **kwargs)
        else:
            self.load_vidjil(file_path, *args, **kwargs)

    def loads(self, string, *args, **kwargs):
        self.loads_vidjil(string, *args, **kwargs)

    def init_data(self, data):
        self.d=data.d
        # Be robust against 'null' values for clones
        if not self.d["clones"]:
            self.d["clones"] = []

        if "diversity" in self.d.keys():
            self.d["diversity"] = Diversity(self.d["diversity"])
        else:
            self.d["diversity"] = Diversity()
        
        if 'distribution' not in self.d['reads'].d:
            self.d['reads'].d['distribution'] = {}

        self.id_lengths = defaultdict(int)

        print("%%")
        for clone in self:
            self.id_lengths[len(clone.d['id'])] += 1
        print ("%% lengths .vidjil -> ", self.id_lengths)
        try:
            print("%% run_v ->", self.d["samples"].d["producer"], self.d["samples"].d["run_timestamp"])
        except KeyError:
            pass

    def load_vidjil(self, file_path, pipeline, verbose=True):
        '''init listWindows with data file
        Detects and selects the parser according to the file extension.'''
        extension = file_path.split('.')[-1]

        with generic_open(file_path, "r", verbose) as f:
            self.init_data(json.load(f, object_hook=self.toPython))
            self.check_version(file_path)

        if pipeline: 
            # renaming, private pipeline
            f = '/'.join(file_path.split('/')[2:-1])
            if verbose:
                print("[%s]" % f)

        else:
            f = file_path
            if verbose:
                print()

        time = os.path.getmtime(file_path)
        self.d["samples"].d["timestamp"] = [datetime.datetime.fromtimestamp(time).strftime("%Y-%m-%d %H:%M:%S")]

    def loads_vidjil(self, string, pipeline, verbose=True):
        '''init listWindows with a json string'''
        self.init_data(json.loads(string, object_hook=self.toPython))

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
        obj.d["diversity"] = self.d["diversity"] + other.d["diversity"]
        if "mrd" in self.d or "mrd" in other.d:
            if not "mrd" in self.d:
                self.d["mrd"] = MRD()
            if not "mrd" in other.d:
                other.d["mrd"] = MRD()

            obj.d["mrd"] = self.d["mrd"] + other.d["mrd"]
        
        try:
            ### Verify that same file is not present twice
            filename_jlist1 = list(self.d["distributions"]["repertoires"].keys())
            filename_jlist2 = list(other.d["distributions"]["repertoires"].keys())
            for filename in filename_jlist1:
                if filename in filename_jlist2:
                    raise( "Error, duplicate file name (in distributions) ")

            ### Append distributions of each files
            obj.d["distributions"] = {}
            obj.d["distributions"]["repertoires"] = {}
            obj.d["distributions"]["keys"]        = ["clones", "reads"]
            obj.d["distributions"]["filters"]     = {}
            obj.d["distributions"]["categories"]  = {}
            for filename in filename_jlist1:
                obj.d["distributions"]["repertoires"][filename] = self.d["distributions"]["repertoires"][filename]
            for filename in filename_jlist2:
                obj.d["distributions"]["repertoires"][filename] = other.d["distributions"]["repertoires"][filename]
        except:
            pass

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

        w=[]

        others = OtherWindows(nb_points)

        for clone in self:
            if (int(clone.d["top"]) <= limit or limit == 0) :
                w.append(clone)
            #else:
                #others += clone

        self.d["clones"] = w #+ list(others) 

        print("### Cut merged file, keeping window in the top %d for at least one point" % limit)
        return self
        
    def load_clntab(self, file_path, *args, **kwargs):
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
        
    def load_airr(self, file_path, pipeline, verbose=True):
        '''
        Parser for AIRR files
        format: https://buildmedia.readthedocs.org/media/pdf/airr-standards/stable/airr-standards.pdf
        '''

        self.d["vidjil_json_version"] = [VIDJIL_JSON_VERSION]
        self.d["samples"].d["original_names"] = [file_path]
        self.d["samples"].d["producer"]       = ["unknown (AIRR format)"]
        self.d["samples"].d["log"]            = ["Created from an AIRR format. No other information available"]
        self.d["reads"].d["germline"] = defaultdict(lambda: [0])
        self.d["diversity"] = Diversity()

        ### Store created clone id
        clone_ids = defaultdict(lambda: False)

        listw = []
        listc = []
        total_size = 0
        i= 0
        import csv
        with generic_open(file_path, 'r', verbose) as tsvfile:
          reader = csv.DictReader(tsvfile, dialect='excel-tab')

          for row in reader:
            row = self.airr_rename_cols(row)
            i += 1

            ### bypass igBlast format
            if "Total queries" in row["sequence_id"]:
                print( "here")
                break



            w=Window(1)
            w.d["seg"] = { "junction":{}, "cdr3":{} }
            
            w.d["id"] = row["sequence_id"]
            # controle that no other clone is presetn with this id
            p = 1
            while clone_ids[w.d["id"]]:
                w.d["id"] = row["sequence_id"] + "_%s" % p
                p += 1
            clone_ids[w.d["id"]] = True
            
            
            w.d["sequence"] = row["sequence"]
            if "duplicate_count" not in row.keys() or row["duplicate_count"] == "":
                w.d["reads"] = [1]
            else :
                w.d["reads"] = [ int(float(row["duplicate_count"])) ]


            ## 'Regular' columns, translated straight from AIRR into .vidjil

            axes = {"locus":  ["germline"],
                    "v_call": ["seg", "5", "name"],
                    "d_call": ["seg", "4", "name"],
                    "j_call": ["seg", "3", "name"],
                    "v_alignment_start":   ["seg","5","start"],
                    "v_alignment_end":     ["seg","5","stop"],
                    "d_alignment_start":   ["seg","4","start"],
                    "d_alignment_end":     ["seg","4","stop"],
                    "j_alignment_start":   ["seg","3","start"],
                    "j_alignment_end":     ["seg","3","stop"],
                    "junction_aa":         ["seg","junction","aa"],
                    "productive":          ["seg","junction","productive"],
                    "cdr1_start":          ["seg","cdr1", "start"],
                    "cdr1_end":            ["seg","cdr1", "stop"],
                    "cdr3_start":          ["seg","cdr3", "start"],
                    "cdr3_end":            ["seg","cdr3", "stop"],
                    "5prime_trimmed_n_nb": ["seg","5","delLeft"],
                    "3prime_trimmed_n_nb": ["seg","3","delLeft"],
                    "warnings":            ["warn"]}
            

            ## Fill .vidjil values with a recursive call
            for axe in axes.keys():
                if axe in row.keys() and row[axe] != "":
                    path   = axes[axe]
                    depth  = 0
                    value  = w.d
                    to_put = self.airr_clean_content(axe, row[axe])

                    while depth != len(path):
                        cat = path[depth]
                        if cat not in value.keys():
                            value[cat] = {}
                        depth += 1
                        
                        if depth != len(path):
                            value  = value[cat]

                    value[cat] = to_put


            listw.append((w , w.d["reads"][0]))

            ##### Special values in .vidjil, recomputed from AIRR data

            ### NAME (simple, vidjil like)
            name = ""
            if "v_call" in row.keys() and row["v_call"] != "":
                name += (" "*int(name != "")) + w.d["seg"]["5"]["name"]
            if "v_call" in row.keys() and row["d_call"] != "":
                name += (" "*int(name != "")) + w.d["seg"]["4"]["name"]
            if "v_call" in row.keys() and row["j_call"] != "":
                name += (" "*int(name != "")) + w.d["seg"]["3"]["name"]
            if name == "":
                "undetermined segmentation"
            w.d["name"] = name


            ### READS
            if not 'germline' in w.d.keys():
                w.d["germline"] = "undetermined"
            self.d["reads"].addAIRRClone( w )
            

            ### Average/coverage
            average_read_length = float(len(row["sequence"]))
            w.d["_average_read_length"] = [average_read_length]
            w.d["_coverage"] = [1.0]
            w.d["_coverage_info"] = ["%.1f bp (100%% of %.1f bp)" % (average_read_length, average_read_length )]
            

            ### Warning
            # Il faut avoir une table pour faire la conversion ? 
            # TODO: undefined for the moment


        #sort by sequence_size
        listw = sorted(listw, key=itemgetter(1), reverse=True)
        #sort by clonotype
        listc = sorted(listc, key=itemgetter(1))
        
        #generate data "top"
        for index in range(len(listw)):
            listw[index][0].d["top"]=index+1
            self.d["clones"].append(listw[index][0])
        return

    def airr_rename_cols(self, row):
        '''Rename columns to homogeneize AIRR data from different software'''
        couples = [
            ## MiXCR
            ("bestVHit", "v_call"), ("bestDHit", "d_call"), ("bestJHit", "j_call"), 
            ("cloneId", "sequence_id"), ("targetSequences", "sequence"),
            ("cloneCount", "duplicate_count"), ("chains", "locus")
        ]
        for couple in couples:
            if couple[0] in row.keys():
                row[couple[1]] = row.pop(couple[0])
        return row


    def airr_clean_content(self, category, value):
        '''
        Clean value of inapropriate content, as species names in segment name
        '''
        cat_boolean = ['productive']
        cat_numeric = [
            'cdr3_start', 'cdr3_end',
            "v_alignment_start", "v_alignment_end",
            "d_alignment_start", "d_alignment_end",
            "j_alignment_start", "j_alignment_end"
        ]

        # Use in the case of IMGT denomination
        if category in ["v_call", "d_call", "j_call"]:
            if "," in value:
                value = value.split(", or")[0]
            # clean specific vquest:
            value = value.replace("Homsap ", "")
            value = value.replace("Homsap_", "")
            value = value.replace(" F", "")
            value = value.replace(" (F)", "")
            value = value.replace(" [ORF]", "")

        ## Give vidjil formating of warning
        if category == 'warnings':
            value = [{"code": value, "level": "warn"}]

        ## convert boolean value (as igBlast productive field for example)
        if category in cat_boolean:
            if value == "T" or value == "true":
                value = True
            elif value == "F" or value == "false":
                value = False

        ## Convert numeric field is given in string format
        if category in cat_numeric:
            value = int(value)
        
        return value

        
    def toJson(self, obj):
        '''Serializer for json module'''
        if isinstance(obj, ListWindows) or isinstance(obj, Window) or isinstance(obj, Samples) or isinstance(obj, Reads) or isinstance(obj, Diversity) or isinstance(obj, MRD):
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

        if "coefficients" in obj_dict:
            obj = MRD()
            obj.d=obj_dict
            # TODO: make this more generic
            obj.d["number"] = len(obj_dict['prevalent'])
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
        
    def save_airr(self, output):
        """
        Create an export of content into AIRR file
        Columns is hardcoded for the moment.
        TODO: add some options to give more flexibility to cols
        """
        ## Constant header
        list_header  = ["filename", "locus", "duplicate_count", "v_call", "d_call", "j_call", "sequence_id", "sequence", "productive"]
        ## not available in this script; but present in AIRR format
        list_header += ["junction_aa", "junction", "cdr3_aa", "warnings", "rev_comp", "sequence_alignment", "germline_alignment", "v_cigar", "d_cigar", "j_cigar"]
        # ## Specificly asked. Need to be added by server side action on vidjil files
        list_header += ["ratio_segmented", "ratio_locus"] #"first_name", "last_name", "birthday", "infos", "sampling_date", "frame"]

        fo = open(output, 'w')
        fo.write( "\t".join(list_header)+"\n")
        for clone in self.d["clones"]:
            reads = clone.d["reads"]
            for time in range(0, len(reads)):
                if reads[time]:
                    fo.write( "\t".join( clone.toCSV(cols=list_header, time=time, jlist=self) )+"\n")
        fo.close()
        return


    def get_filename_pos(self, filename):
        """ filename is the key of distributions repertoires """
        return self.d["samples"].d["original_names"].index(filename)


    # ========================= #
    #  Distributions computing  #
    # ========================= #
    def init_distrib(self, list_distrib):
        """ Create distributions structures """
        self.d["distributions"] = {}
        self.d["distributions"]["repertoires"] = defaultdict(lambda:[])
        self.d["distributions"]["keys"]        = ["clones", "reads"]
        self.d["distributions"]["filters"]     = []
        # Warning, will fail of there are same original_names; fixme

        nb_sample = self.d["samples"].d["number"]
        # prefill distribution for each file of jlist
        for filename in self.d["samples"].d["original_names"]:
            for distrib in list_distrib:
                self.d["distributions"]["repertoires"][filename].append({"axes":distrib,"values":defaultdict(lambda: False)})
        return


    def compute_distribution(self, list_distrib):
        """ Compute the distributions given in list_distrib """
        for filename in self.d["samples"].d["original_names"]:
            timepoint = self.get_filename_pos(filename)
            for clone in self.d["clones"]:
                if clone.d["reads"][timepoint] != 0:
                    for distrib_pos in range( len(self.d["distributions"]["repertoires"][filename]) ):
                        distrib      = list_distrib[distrib_pos]
                        clone_values = clone.get_axes_values( distrib, timepoint )
                        nb_reads     = clone.get_reads(self.get_filename_pos(filename))
                        self.add_clone_values( filename, distrib_pos, clone_values, nb_reads)
        return


    def add_clone_values(self, filename, distrib_pos, values, nb_reads):
        """ Add value of a clone to a specific distribution """
        obj = self.d["distributions"]["repertoires"][filename][distrib_pos]["values"]
        obj = self.recursive_add(obj, values, nb_reads) ## Add by recursion
        self.d["distributions"]["repertoires"][filename][distrib_pos]["values"] = obj
        return

    def recursive_add( self, obj, values, nb_reads):
        """
        Add (1, nb_reads) by recursively iterating over values.
        For example self.recursive_add(obj, [val1, val2], nb_reads) add (1, nb_reads) to obj[val1][val2]
        Return the updated incremented object
        """
        if len(values) > 1:
            # Should increase for one depth
            nvalues = values[1:]
            if not obj[values[0]] :
                obj[values[0]] = defaultdict(lambda: False)
            obj[values[0]] = self.recursive_add(obj[values[0]], nvalues, nb_reads)
        else:
            # last depth
            if not obj:
                obj = defaultdict(lambda: False)
            if not obj[values[0]]:
                obj[values[0]] = [0, 0]

            obj[values[0]][0] += 1
            obj[values[0]][1] += nb_reads
        return obj


    ##########################
    ###  Morisita's index  ###
    ##########################
    def computeOverlaps(self):
        '''
        Compute, for each combinaison of sample, various overlap indexs
        '''
        nb_sample = self.d["samples"].d["number"]
        self.d["overlaps"] = {}
        self.d["overlaps"]["morisita"] = []
        self.d["overlaps"]["jaccard"]  = []

        for pos_0 in range(0, nb_sample):
            morisita = []
            jaccard  = []
            for pos_1 in range(0, nb_sample):
                print( "Overlap: %s vs %s" % (pos_0, pos_1) )
                morisita.append( self.computeOverlapMorisita(pos_0, pos_1) )
                jaccard.append(  self.computeOverlapJaccard(pos_0, pos_1)  )
            self.d["overlaps"]["morisita"].append( morisita)
            self.d["overlaps"]["jaccard"].append(  jaccard )
            
        return


    def computeOverlapMorisita(self, pos_0, pos_1):
        """
        Morisita-Horn similarity index
        This index apply to quantitative data.
        Allow to evaluate the similarity between different groups, and is not sensible by richness of sampling
        Formula:  CMH = 2 ∑▒((ai x bi))/((da+db)x(Na x Nb))
        da = ∑ai2/Na2
        db = ∑bi2/Nb2
        Na = Total number of species at site A
        Nb = Total number of species at site B
        ai = Number of species i at site A
        bi = Number of species i at site B
        # Values between 0 (completly different communityes) and 1 (maximal similarity).
        # 2 groups are similare (poor diversity) if CMH value is superior to 0.5
        # and dissemblables if value is under 0,5 (high diversity).
        !!! Computed only on present clones (so should be run with `-Y all`)
        """
        clones    = self.d["clones"]

        m  = 0
        da = 0
        db = 0

        for clone in clones:
            ai = clone.d["reads"][pos_0]
            bi = clone.d["reads"][pos_1]
            m  += (ai * bi)
            da += (ai*ai)
            db += (bi*bi)

        d = (da+db)/2
        if m == 0: #if really no shared clones
            res =  0
        else:
            res = round( (m/d), 3) 

        return res


    def computeOverlapJaccard(self, pos_0, pos_1):
        """
        Jaccard similarity index
        Formula :
            I = Nc / (N1 + N2 - Nc)
        Nc : number of shared taxons between stations
        N1 et N2 : number of taxons present only in stations 1 or 2
        This index is from 0 to 1 and take into account only positive relations.
        If index increase, an important number of species is present in only one location,
        with a poor inter-location biodiversity.
        """
        clones    = self.d["clones"]
        reads     = self.d["reads"].d["segmented"]
        N1 = self.get_nb_species_of_sample(pos_0)
        N2 = self.get_nb_species_of_sample(pos_1)

        Nc = 0
        for clone in clones:
            ai = clone.d["reads"][pos_0]
            bi = clone.d["reads"][pos_1]
            Nc  += bool(ai * bi)
        # print( "Nc: %s" % Nc)
        if Nc == 0: # if really no shared clones
            return 0

        I = round( (Nc / (N1 + N2 - Nc)), 3)
        return I


    def get_nb_species_of_sample(self, pos):
        X = 0
        for clone in self.d["clones"]:
            if clone.d["reads"][pos]:
                X += 1
        return X



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

seg_w7 = {
  "germline": "TRA",
  "id": "TTCTTACTTCTGTGCTACGGACGCCGGGGCTCAGGAACCTACAAATACAT",
  "name": "TRAV17*01 0/CCGGGG/5 TRAJ40*01",
  "reads": [
    16
  ],
  "_average_read_length": [
    168.468,
    168.568,
  ],
  "seg": {
    "3": {
      "delLeft": 5,
      "name": "TRAJ40*01",
      "start": 112
    },
    "5": {
      "delRight": 0,
      "name": "TRAV17*01",
      "stop": 105
    },
    "N": 6,
    "cdr3": {
      "aa": "ATDAG#SGTYKYI",
      "start": 96,
      "stop": 133
    },
    "evalue": {
      "val": "1.180765e-43"
    },
    "evalue_left": {
      "val": "1.296443e-47"
    },
    "evalue_right": {
      "val": "1.180635e-43"
    },
    "junction": {
      "aa": "CQQSYSTPYTF",
      "productive": True,
      "start": 93,
      "stop": 136
    },
  },
  "germline": "TRA",
  "_coverage": [
    0.973684191703796
  ],
  "_coverage_info": [
    "74 bp (97% of 76.0 bp)"
  ],
  "sequence": "GTGGAAGATTAAGAGTCACGCTTGACACTTCCAAGAAAAGCAGTTCCTTGTTGATCACGGCTTCCCGGGCAGCAGACACTGCTTCTTACTTCTGTGCTACGGACGCCGGGGCTCAGGAACCTACAAATACATCTTTGGAACAG",
  "top": 26
}

lw1 = ListWindows()
lw1.d["timestamp"] = 'ts'
lw1.d["reads"] = json.loads('{"total": [30], "segmented": [25], "germline": {}, "distribution": {}}', object_hook=lw1.toPython)
lw1.d["clones"].append(w5)
lw1.d["clones"].append(w6)
lw1.d["diversity"] = Diversity()


w7 = Window(1)
w7.d ={"id" : "aaa", "reads" : [8], "top" : 4 }
w8 = Window(1)
w8.d ={"id" : "ccc", "reads" : [2], "top" : 8, "test" : ["plop"] }

lw2 = ListWindows()
lw2.d["timestamp"] = 'ts'
lw2.d["reads"] = json.loads('{"total": [40], "segmented": [34], "germline": {}, "distribution": {}}', object_hook=lw1.toPython)
lw2.d["clones"].append(w7)
lw2.d["clones"].append(w8)
lw2.d["diversity"] = Diversity()



def get_preset_of_distributions():
    """
    Return a list of distributions

    This is now the list of combinations of any two different axes.

    >>> lst = get_preset_of_distributions(); ["seg5", "seg3"] in lst
    True
    >>> lst = get_preset_of_distributions(); ["seg5", "seg5"] in lst
    False
    >>> lst = get_preset_of_distributions(); ["seg5", "unknow"] in lst
    False
    >>> len(lst)
    959
    """
    lst_axes = AVAILABLE_AXES
    LIST_DISTRIBUTIONS = []

    for axis1 in lst_axes:
        LIST_DISTRIBUTIONS.append([axis1])
        for axis2 in lst_axes:
            if axis1 != axis2:
                LIST_DISTRIBUTIONS.append([axis1, axis2])
    return LIST_DISTRIBUTIONS


def exec_command(command, directory, input_file):
    '''
    Execute the command `command` from the directory
    `directory`. The executable must exist in
    this directory. No path changes are allowed in `command`.
    
    Returns the output filename (a .vidjil). 
    '''
    # split command
    soft = command.split()[0]
    args = command[len(soft):]

    assert (not os.path.sep in command), "No {} allowed in the command name".format(os.path.sep)
    ff = tempfile.NamedTemporaryFile(suffix='.vidjil', delete=False)

    basedir = os.path.dirname(os.path.abspath(sys.argv[0]))
    command_fullpath = basedir+os.path.sep+directory+os.path.sep+soft
    com = '%s %s -i %s -o %s' % (quote(command_fullpath), args, quote(os.path.abspath(input_file)), ff.name)
    print("Preprocess command: \n%s" % com)
    os.system(com)
    print()
    return ff.name


 
def main():
    print("#", ' '.join(sys.argv))

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
    group_options.add_argument('--ijson', action='store_true', help='use the ijson vidjilparser')

    group_options.add_argument('--output', '-o', type=str, default='fused.vidjil', help='output file (%(default)s)')
    group_options.add_argument('--top', '-t', type=int, default=50, help='keep only clones in the top TOP of some point (%(default)s)')

    group_options.add_argument('--first', '-f', type=int, default=0, help='take only into account the first FIRST files (0 for all) (%(default)s)')

    group_options.add_argument('--pre', type=str,help='pre-process program (launched on each input .vidjil file) (needs defs.PRE_PROCESS_DIR). \
                                             Program should take arguments -i/-o for input of vidjil file and output of temporary modified vidjil file.')

    group_options.add_argument("--distribution", "-d", action='append', type=str, help='compute the given distribution; callable multiple times')
    group_options.add_argument('--distributions-all', '-D', action='store_true', default=False, help='compute a preset of distributions')
    group_options.add_argument('--distributions-list', '-l', action='store_true', default=False, help='list the available axes for distributions')
    group_options.add_argument('--no-clones', action='store_true', default=False, help='do not output individual clones')

    group_options.add_argument('--export-airr', action='store_true', default=False, help='export data in AIRR format.')
    group_options.add_argument('--overlaps', action='store_true', default=False, help='Compute overlaps index of repertoires.')

    parser.add_argument('file', nargs='+', help='''input files (.vidjil/.cnltab)''')

    args = parser.parse_args()

    if args.test:
        import doctest
        doctest.testmod(verbose = True)
        sys.exit(0)

    jlist_fused = None

    LIST_DISTRIBUTIONS = []
    if args.distributions_list:
        print("### Available axes for distributions:\n%s\n" % AVAILABLE_AXES)

    if args.distributions_all:
        LIST_DISTRIBUTIONS = get_preset_of_distributions()

    if args.distribution:
        for elt in args.distribution:
            axes = elt.split(",")
            if axes not in LIST_DISTRIBUTIONS:
                LIST_DISTRIBUTIONS.append(axes)

    print("### fuse.py -- " + DESCRIPTION)
    print()

    files = args.file
    if args.first:
        if len(files) > args.first:
            print("! %d files were given. We take into account the first %d files." % (len(files), args.first))
        files = files[:args.first]

    if args.pre:
        print("Pre-processing files...")
        pre_processed_files = []
        for f in files:
            out_name = exec_command(args.pre, PRE_PROCESS_DIR, f)
            pre_processed_files.append(out_name)
        files = pre_processed_files

    #filtre
    f = []

    if args.ijson:
        from vidjilparser import VidjilParser
        vparser = VidjilParser()
        vparser.addPrefix('clones.item', 'clones.item.top', le, args.top)

    for path_name in files:
        if args.ijson:
            json_clones = vparser.extract(path_name)
            clones = json.loads(json_clones)
            if clones["clones"] is not None:
                f += [c['id'] for c in clones["clones"]]
        else:
            jlist = ListWindows()
            jlist.load(path_name, args.pipeline)
            f += jlist.getTop(args.top)

    f = sorted(set(f))
    
    if args.ijson:
        vparser.reset()
        vparser.addPrefix('')
        vparser.addPrefix('clones.item', 'clones.item.id', (lambda x, y: x in y), f)

    if args.multi:
        for path_name in files:
            jlist = ListWindows()
            if args.ijson:
                json_reads = vparser.extract(path_name)
                jlist.loads(json_reads, args.pipeline)
            else:
                jlist.load(path_name, args.pipeline)
                jlist.build_stat()
            
            print("\t", jlist, end=' ')

            if jlist_fused is None:
                jlist_fused = jlist
            else:
                jlist_fused = jlist_fused * jlist
                
            print('\t==> merge to', jlist_fused)
        jlist_fused.d["system_segmented"] = ordered(jlist_fused.d["system_segmented"], key=lambda sys: ((GERMLINES_ORDER + [sys]).index(sys), sys))
        
    else:
        print("### Read and merge input files")
        for path_name in files:
            jlist = ListWindows()
            if args.ijson:
                json_reads = vparser.extract(path_name)
                jlist.loads(json_reads, args.pipeline)
            else:
                jlist.load(path_name, args.pipeline)
                jlist.build_stat()
                if len(LIST_DISTRIBUTIONS):
                    jlist.init_distrib(LIST_DISTRIBUTIONS)
                    jlist.compute_distribution(LIST_DISTRIBUTIONS)
                jlist.filter(f)

            
            print("\t", jlist, end=' ')
            # Merge lists
            if jlist_fused is None:
                jlist_fused = jlist
            else:
                jlist_fused = jlist_fused + jlist
            
            print('\t==> merge to', jlist_fused)

    if args.compress:
        print()
        print("### Select point names")
        l = jlist_fused.d["samples"].d["original_names"]
        ll = interesting_substrings(l)
        print("  <==", l)
        print("  ==>", ll)
        jlist_fused.d["samples"].d["names"] = ll
    
    print()
    if not args.multi:
        jlist_fused.cut(args.top, jlist_fused.d["samples"].d["number"])
    print("\t", jlist_fused) 
    print()

    #compute similarity matrix
    if len(jlist_fused.d["clones"]) < SIMILARITY_LIMIT :
        fasta = ""
        for i in range(len(jlist_fused.d["clones"])) :
            fasta += ">>" + str(i) + "\n"
            fasta += jlist_fused.d["clones"][i].d["id"] + "\n"
        fasta_file = tempfile.NamedTemporaryFile(mode="w", delete=False)
        fasta_file.write(fasta)
        try:
            out = subprocess.check_output([TOOL_SIMILARITY, "-j", fasta_file.name])
            jlist_fused.d["similarity"] = json.loads(out)
        except OSError:
            print("! failed: %s" % TOOL_SIMILARITY)
        finally:
            os.unlink(fasta_file.name)
    else : 
        jlist_fused.d["similarity"] = [];
        

    if args.overlaps:
        print("### Overlaps index")
        jlist_fused.computeOverlaps()
    
    if args.no_clones:
        # TODO: do not generate the list of clones in this case
        del jlist_fused.d["clones"]

    print("### Save merged file")
    if args.export_airr:
        output= args.output.replace(".vidjil", ".airr")
        jlist_fused.save_airr(output)
    else:
        jlist_fused.save_json(args.output)
    
    
    
if  __name__ =='__main__':
    main()
