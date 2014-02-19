#!/usr/bin/env python
# -*- coding: utf-8 -*-

### fuse.py - Vidjil utility to parse and regroup list of clones of different timepoints or origins

#  This file is part of "Vidjil" <http://bioinfo.lifl.fr/vidjil>
#  Copyright (C) 2011, 2012, 2013, 2014 by Bonsai bioinformatics at LIFL (UMR CNRS 8022, Université Lille) and Inria Lille
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

import collections
import json
import argparse
import sys
import time
import copy
from operator import itemgetter


####

class Window:
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
        self.d["window"] = ""
        self.d["top"] = sys.maxint
        self.d["size"] = []
        for i in range(size):
            self.d["size"].append(0)
        
        
    ### 
    def __add__(self, other):
        #data we don't need to duplicate
        myList = [ "V", "D", "J", "Vend", "Dend", "Jstart", "Dstart", "top", "window", "Nlength", "sequence", "name" ]
        obj = Window(1)
        
        t1 = []
        t2 = []
        
        for i in range(len(self.d["size"])):
            t1.append(0)
        for i in range(len(other.d["size"])):
            t2.append(0)
            
        #concat data, if there is some missing data we use an empty buffer t1/t2 
        #with the same size as the number of misssing data
        for key in self.d :
            if key not in myList :
                obj.d[key] = self.d[key]
                if key not in other.d :
                    obj.d[key] += t2
        
        for key in other.d :
            if key not in myList :
                if key not in obj.d :
                    obj.d[key] = t1 + other.d[key]
                else :
                    obj.d[key] += other.d[key]
                    
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
        
    ### print essential info about Window
    def __str__(self):
        return "<window : %s %d %s>" % ( self.d["size"], self.d["top"], self.d["window"])
        
        
        
class ListWindows:
    '''storage class for sequences informations 
    
    >>> lw1.info()
    <ListWindows : [[25]] 2 >
    <window : [5] 3 aaa>
    <window : [12] 2 bbb>
    
    >>> lw2.info()
    <ListWindows : [[34]] 2 >
    <window : [8] 4 aaa>
    <window : [2] 8 ccc>
    
    >>> lw3 = lw1 + lw2 
    >>> lw3.info()
    <ListWindows : [[25], [34]] 3 >
    <window : [12, 0] 2 bbb>
    <window : [5, 8] 3 aaa>
    <window : [0, 2] 8 ccc>
    
    '''
    
    def __init__(self):
        '''init ListWindows with the minimum data required'''
        self.d={}
        self.d["windows"] = []
        self.d["clones"] = []
        self.d["reads_segmented"] = [[0]]
        
    def __str__(self):
        return "<ListWindows : %s %d >" % ( self.d["reads_segmented"], len(self.d["windows"]) )

    ### print info about each Windows stored 
    def info(self):
        print self
        for i in range(len(self.d["windows"])):
            print self.d["windows"][i]
        
    ### save / load to .json

    def save_json(self, output):
        '''save ListWindows in .json format''' 
        print "==>", output
        with open(output, "w") as file:
            json.dump(self, file, indent=2, default=self.toJson)
            
    def load(self, file_path):
        '''init listWindows with data file
        Detects and selects the parser according to the file extension.'''

        name = file_path.split("/")[-1]
        extension = file_path.split('.')[-1]
        
        print "<==", file_path, "\t", name, "\t", 
        
        if (extension=="data"): 
            with open(file_path, "r") as file:
                tmp = json.load(file, object_hook=self.toPython)       
                self.d=tmp.d
                
        elif (extension=="clntab"):
            self.load_clntab(file_path)
                
        else:
            raise IOError ("Invalid file extension .%s" % extension)
        
    ### 
    def __add__(self, other): 
        '''Combine two ListWindows into a unique ListWindows'''
        obj = ListWindows()
        t1=[]
        t2=[]

        for i in range(len(self.d["reads_segmented"])):
            t1.append(0)
    
        for i in range(len(other.d["reads_segmented"])):
            t2.append(0)
    
        #concat data, if there is some missing data we use an empty buffer t1/t2 
        #with the same size as the number of missing data
        for key in self.d :
            if key != "windows" :
                obj.d[key] = self.d[key]
                if key not in other.d :
                    obj.d[key] += t2

        for key in other.d :
            if key != "windows" :
                if key not in obj.d :
                    obj.d[key] = t1 + other.d[key]
                else :
                    obj.d[key] += other.d[key]
        
        obj.d["windows"]=self.fuseWindows(self.d["windows"], other.d["windows"], t1, t2)

        return obj
        
    ### 
    def fuseWindows(self, w1, w2, t1, t2) :
        #store data in dict with "window" as key
        dico1 = {}
        for i in range(len(w1)) :
            dico1[ w1[i].d["window"] ] = w1[i]

        dico2 = {}
        for i in range(len(w2)) :
            dico2[ w2[i].d["window"] ] = w2[i]

        #concat data with the same key ("window")
        #if some data are missing we concat with an empty Windows()
        dico3 = {}
        for key in dico1 :
            if key in dico2 :
                dico3[key] = dico1[key] + dico2[key]
            else :
                w=Window(len(t2))
                dico3[key] = dico1[key] + w

        for key in dico2 :
            if key not in dico1 :
                w=Window(len(t1))
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
        
    
    def cut(self, limit):
        '''Delete all information from sequence/windows who never enter in the most represented sequences.'''

        length = len(self.d["windows"])
        w=[]
    
        for index in range(length): 
            if (int(self.d["windows"][index].d["top"]) < limit or limit == 0) :
                w.append(self.d["windows"][index])

        self.d["windows"]=w
        self.d["germline"]=self.d["germline"][0]

        print "! cut to %d" % limit
        return self
        
    def load_clntab(self, file_path):
        '''Parser for .clntab file'''

        self.d["timestamp"] = "1970-01-01 00:00:00"
        self.d["normalization_factor"] = [1]
        
        listw = []
        listc = []
        total_size = 0
        
        fichier = open(file_path,"r")
        for ligne in fichier:
            if "clonotype" in ligne:
                header_map = ligne.split('\t')
            else :
                if "IGH" in ligne:
                    self.d["germline"] = ["IGH"]
                elif "TRG" in ligne :
                    self.d["germline"] = ["TRG"]
                else :
                    self.d["germline"] = ["???"]

                tab = AccessedDict()
                for index, data in enumerate(ligne.split('\t')):
                    tab[header_map[index]] = data
                        
                w=Window(1)
                #w.window=tab["sequence.seq id"] #use sequence id as window for .clntab data
                w.d["window"]=tab["sequence.raw nt seq"] #use sequence as window for .clntab data
                s = int(tab["sequence.size"])
                total_size += s
                w.d["size"]=[ s ]

                w.d["sequence"] = tab["sequence.raw nt seq"]
                w.d["V"]=tab["sequence.V-GENE and allele"].split('=')
                if (tab["sequence.D-GENE and allele"] != "") :
                    w.d["D"]=tab["sequence.D-GENE and allele"].split('=')
                w.d["J"]=tab["sequence.J-GENE and allele"].split('=')

                # use sequence.JUNCTION to colorize output (this is not exactly V/J !)
                junction = tab.get("sequence.JUNCTION.raw nt seq")
                position = w.d["sequence"].find(junction)
                if position >= 0:
                    w.d["Jstart"] = position + len(junction)
                    w.d["Vend"] = position 
                    w.d["Nsize"] = len(junction)
                else:
                    w.d["Jstart"] = 0
                    w.d["Vend"] = len(w.d["sequence"])
                    w.d["Nsize"] = 0
                w.d["name"]=w.d["V"][0] + " -x/y/-z " + w.d["J"][0]
                w.d["Dend"]=0
                w.d["Dstart"]=0
                    
                listw.append((w , w.d["size"][0]))

                raw_clonotype = tab.get("clonotype")
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
            self.d["windows"].append(listw[index][0])
        
        self.d["reads_segmented"] = [total_size]

        
    def toJson(self, obj):
        '''Serializer for json module'''
        if isinstance(obj, ListWindows):
            result = {}
            for key in obj.d :
                result[key]= obj.d[key]
                
            return result
            raise TypeError(repr(obj) + " fail !") 
        if isinstance(obj, Window):
            result = {}
            for key in obj.d :
                result[key]= obj.d[key]
            
            return result
            raise TypeError(repr(obj) + " fail !") 


    def toPython(self, obj_dict):
        '''Reverse serializer for json module'''
        if "reads_total" in obj_dict:
            obj = ListWindows()
            for key in obj_dict :
                if isinstance(obj_dict[key], list):
                    obj.d[key]=obj_dict[key]
                else :
                    obj.d[key]=[obj_dict[key]]
            return obj

        if "window" in obj_dict:
            obj = Window(1)
            for key in obj_dict :
                obj.d[key]=obj_dict[key]
            return obj
        


 
class AccessedDict(dict):
    '''Dictionary providing a .not_accessed_keys() method
    Note that access with .get(key) are not tracked.

    >>> d = AccessedDict({1:11, 2:22, 3: 33, 4: 44})

    >>> d[1], d[3]
    (11, 33)

    >>> list(d.not_accessed_keys())
    [2, 4]
    '''

    def __init__(self, *args, **kwargs):
        dict.__init__(self, *args, **kwargs)
        self.accessed_keys = []

    def __getitem__(self, key):
        self.accessed_keys.append(key)
        return dict.__getitem__(self, key)

    def not_accessed_keys(self):
        for key in self.keys():
            if key in self.accessed_keys:
                continue
            yield key





### some data used for test
w1 = Window(1)
w1.d ={"window" : "aaa", "size" : [5], "top" : 3 }
w2 = Window(1)
w2.d ={"window" : "bbb", "size" : [12], "top" : 2 }
w3 = Window(1)
w3.d ={"window" : "aaa", "size" : [8], "top" : 4 }
w4 = Window(1)
w4.d ={"window" : "ccc", "size" : [2], "top" : 8, "test" : ["plop"] }


w5 = Window(1)
w5.d ={"window" : "aaa", "size" : [5], "top" : 3 }
w6 = Window(1)
w6.d ={"window" : "bbb", "size" : [12], "top" : 2 }

lw1 = ListWindows()
lw1.d["reads_segmented"]=[[25]]
lw1.d["windows"].append(w5)
lw1.d["windows"].append(w6)

w7 = Window(1)
w7.d ={"window" : "aaa", "size" : [8], "top" : 4 }
w8 = Window(1)
w8.d ={"window" : "ccc", "size" : [2], "top" : 8, "test" : ["plop"] }

lw2 = ListWindows()
lw2.d["reads_segmented"]=[[34]]
lw2.d["windows"].append(w7)
lw2.d["windows"].append(w8)

    
    

 
def main():
    DESCRIPTION = 'Vidjil utility to parse and regroup list of clones of different timepoints or origins'

    #### Argument parser (argparse)

    parser = argparse.ArgumentParser(description= DESCRIPTION,
                                    epilog='''Example:
                                    python2 %(prog)s -s 2 -m 13''',
                                    formatter_class=argparse.RawTextHelpFormatter)


    group_options = parser.add_argument_group() # title='Options and parameters')

    group_options.add_argument('--output', '-o', type=str, default='fused.data', help='output file (%(default)s)')
    group_options.add_argument('--max-clones', '-z', type=int, default=50, help='maximum number of clones')
    group_options.add_argument('--test', '-t', action='store_true', help='run self-tests')

    parser.add_argument('file', nargs='+', help='''input files (.vidjil/.cnltab)''')
  
    args = parser.parse_args()
    # print args

    if args.test:
        import doctest
        doctest.testmod()
        sys.exit(0)

    jlist_fused = None
    times = []

    for path_name in args.file:
        jlist = ListWindows()
        jlist.load(path_name)
        
        w1 = Window(1)
        w2 = Window(2)
        w3 = w1+w2
        
        print jlist
        # Merge lists
        if jlist_fused is None:
            jlist_fused = jlist
        else:
            jlist_fused = jlist_fused + jlist
        print jlist_fused
        
    jlist_fused.cut(args.max_clones)
    jlist_fused.d["time"] = times
    print jlist_fused 
    jlist_fused.save_json(args.output)

    
    
if  __name__ =='__main__':
    main()
