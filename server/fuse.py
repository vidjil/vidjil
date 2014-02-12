import collections
import json
import argparse
import sys
import time
from operator import itemgetter
 

DESCRIPTION = 'Vidjil utility to parse and regroup list of clones of different timepoints or origins'

#### Argument parser (argparse)

parser = argparse.ArgumentParser(description= DESCRIPTION,
                                 epilog='''Example:
                                 python2 %(prog)s -s 2 -m 13''',
                                 formatter_class=argparse.RawTextHelpFormatter)


group_options= parser.add_argument_group() # title='Options and parameters')

group_options.add_argument('--output', '-o', type=str, default='fused.data', help='output file (%(default)s)')
group_options.add_argument('--max-clones', '-z', type=int, default=50, help='maximum number of clones')

parser.add_argument('file', nargs='+', help='''input files (.vidjil/.cnltab)''')


####

 
class ListWindows:
  def __init__(self):
    self.d={}
    self.d["windows"] = []
    self.d["clones"] = []

  def __str__(self):
    return "<windows : %s %d>" % ( self.d["reads_segmented"], len(self.d["windows"]))
 
class Window:
  def __init__(self):
    self.d={}
    self.d["top"] = sys.maxint
    
jlist1 = []
jlist2 = []
 
 
 
#serialiseur perso, convertit un objet python en json
### TODO: mettre cela en methode ListWindows.save_json()
def juncToJson(obj):
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

        

#deserialiseur perso, convertit un format json en objet python correspondant
### TODO: mettre cela en methode ListWindows.load_json()
def jsonToJunc(obj_dict):
    if "reads_total" in obj_dict:
        obj = ListWindows()
        for key in obj_dict :
            if isinstance(obj_dict[key], list):
                obj.d[key]=obj_dict[key]
            else :
                obj.d[key]=[obj_dict[key]]
        return obj

    if "window" in obj_dict:
        obj = Window()
        for key in obj_dict :
            obj.d[key]=obj_dict[key]
        return obj
        



### TODO: methode .load_clntab()    
def clntabParser(file_path):
    
    out = ListWindows()
    out.d["timestamp"] = "1970-01-01 00:00:00"
    out.d["normalization_factor"] = [1]
    
    listw = []
    listc = []
    total_size = 0
    
    fichier = open(file_path,"r")
    for ligne in fichier:
        if "clonotype" in ligne:
            header_map = ligne.split('\t')
        else :
            if "IGH" in ligne:
                out.d["germline"] = ["IGH"]
            elif "TRG" in ligne :
                out.d["germline"] = ["TRG"]
            else :
                out.d["germline"] = ["???"]

            tab = {}
            for index, data in enumerate(ligne.split('\t')):
                tab[header_map[index]] = data
                    
            w=Window()
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
            junction = tab["sequence.JUNCTION.raw nt seq"]
            position = w.d["sequence"].find(junction)
            if position >= 0:
                w.d["Jstart"] = position
                w.d["Vend"] = position + len(junction)
                w.d["Nsize"] = len(junction)
            else:
                w.d["Jstart"] = 0
                w.d["Vend"] = len(w.d["sequence"])
                w.d["Nsize"] = 0
            w.d["name"]=w.d["V"][0] + " -x/y/-z " + w.d["J"][0]
            w.d["Dend"]=0
            w.d["Dstart"]=0
                
            listw.append((w , w.d["size"][0]))
                
            clonotype = tab["clonotype"].split(' ')
            if (len(clonotype) > 1) :
                listc.append((w , tab["clonotype"]))
                
            #those data have been stored under a different name to be compatible with Vidjl
            already_stored = ["sequence.raw nt seq", "sequence.V-GENE and allele",
                "sequence.D-GENE and allele", "sequence.J-GENE and allele", "sequence.size"]
            
            #keep other data
            info = {}
            for i in range(len(header_map)):
                if header_map[i] not in already_stored:
                    w.d["_"+header_map[i]]=[tab[header_map[i]]]

    #sort by sequence_size
    listw = sorted(listw, key=itemgetter(1), reverse=True)
    #sort by clonotype
    listc = sorted(listc, key=itemgetter(1))
    
    #generate data "top"
    for index in range(len(listw)):
        listw[index][0].d["top"]=index+1
        out.d["windows"].append(listw[index][0])
        
    #cluster / clonotype
    clone = {}
    clone["name"] = listc[0][1]
    clone["cluster"] = []
    clonotype_name = clone["name"]
    
    for index in range(len(listc)):
        
        if (clonotype_name != listc[index][1]):
            out.d["clones"].append(clone)
            clone = {}
            clone["name"] = listc[index][1]
            clone["cluster"] = []
        clonotype_name = listc[index][1]
        clone["cluster"].append(listc[index][0].d["window"])
    out.d["clones"].append(clone)
    
    out.d["reads_segmented"] = [total_size]
    return out
    
    
    
def cutList(l1, limit):
  
  length1 = len(l1.d["windows"])
  w=[]
  
  for index in range(length1): 
    if (int(l1.d["windows"][index].d["top"]) < limit or limit == 0) :
      w.append(l1.d["windows"][index])

  l1.d["windows"]=w
  
  
  l1.d["germline"]=l1.d["germline"][0]

  print "! cut to %d" % limit
  return l1
  
  
  
  
### fusionne 2 objet ListWindows() en 1 seul
### code difficilement lisible
### TODO, methode ListWindows.__add__(self, other) 
### et surtout, separer de cela une methode Windows.__add__(self, other) qui fait l'ajout de 2 windows
### il ne devrait y avoir ni tampon, ni dataseg...

def fuseList(l1, l2): 

  if l1 is None:
    return l2

  obj = ListWindows()
  
  size_l1 = len(l1.d["reads_segmented"])
  size_l2 = len(l2.d["reads_segmented"])
  tampon=[]
  tampon2=[]

  for i in range(size_l1):
    tampon.append(0)
  
  for i in range(size_l2):
    tampon2.append(0)
  
  
  for key in l1.d :
      if key != "windows" :
          obj.d[key] = l1.d[key]
          if key not in l2.d :
              obj.d[key] += tampon2

  for key in l2.d :
      if key != "windows" :
          if key not in obj.d :
              obj.d[key] = tampon1 + l2.d[key]
          else :
              obj.d[key] += l2.d[key]
              
  obj.d["windows"]=fuseWindows(l1.d["windows"], l2.d["windows"], tampon, tampon2)

  return obj
  
  
  
### fusionne 2 liste d'objets Window() en une seule
def fuseWindows(w1, w2, t1, t2) :

    
    dico1 = {}
    for i in range(len(w1)) :
        dico1[ w1[i].d["window"] ] = w1[i]

    dico2 = {}
    for i in range(len(w2)) :
        dico2[ w2[i].d["window"] ] = w2[i]
    
    w=Window()
    
    dico3 = {}
    for key in dico1 :
        if key in dico2 :
            dico3[key] = fuseWindow(dico1[key],dico2[key],t1,t2)
        else :
            dico3[key] = fuseWindow(dico1[key],w,t1,t2)

    for key in dico2 :
        if key not in dico1 :
            dico3[key] = fuseWindow(w,dico2[key],t1,t2)
    
    
    #sort by top
    tab = []
    for key in dico3 :
        tab.append((dico3[key], dico3[key].d["top"]))
    tab = sorted(tab, key=itemgetter(1))
    
    result=[]
    for i in range(len(tab)) :
        result.append(tab[i][0])
    
    return result
    
    
  
### fusionne 2 objets Window() en un seul
def fuseWindow(w1, w2, t1, t2) :
    
    #liste des elements a garder en 1 exemplaire
    myList = [ "V", "D", "J", "Vend", "Dend", "Jstart", "Dstart", "top", "window", "Nsize", "sequence", "name" ]
    obj = Window()
    
    for key in w1.d :
        if key not in myList :
            obj.d[key] = w1.d[key]
            if key not in w2.d :
                obj.d[key] += t2
    
    for key in w2.d :
        if key not in myList :
            if key not in obj.d :
                obj.d[key] = t1 + w2.d[key]
            else :
                obj.d[key] += w2.d[key]
                
    if w2.d["top"] < w1.d["top"] :
        for key in w2.d :
            if key in myList :
                obj.d[key] = w2.d[key]
    else :
        for key in w1.d :
            if key in myList :
                obj.d[key] = w1.d[key]
    
    return obj

    
    
    
  
args = parser.parse_args()
print args

jlist_fused = None
times = []

for path_name in args.file:
    # Compute short name
    split=path_name.split("/");
    name="";
    if (len(split)>1):
        name = split[len(split)-1]
    else:
        name = path_name

    name = name.replace('.fa', '')
    name = name.replace('_BCD', '')

    print "<==", path_name, "\t", name, "\t", 
    
    extension = path_name.split('.')[-1]
    
    if (extension=="data"): 
        with open(path_name, "r") as file:
            jlist = json.load(file, object_hook=jsonToJunc)       
            print jlist
            
    elif (extension=="clntab"):
        jlist = clntabParser(path_name)
        print jlist
            
    else :
        print "\n ERROR .", extension, " invalid file extension"
        sys.exit()
        
    # Merge lists
    jlist_fused = fuseList(jlist_fused, jlist)
    # Store short name
    times.append(name)

print

jlist_fused = cutList(jlist_fused, args.max_clones)
jlist_fused.d["time"] = times
print jlist_fused 
  
print "==>", args.output
with open(args.output, "w") as file:
    json.dump(jlist_fused, file, indent=2, default=juncToJson)
