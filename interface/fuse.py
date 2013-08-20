import collections
import json
import sys
 
 
class Junctions:
  def __init__(self):
    self.total_size = []
    self.time = []
    self.junctions = []
 
class Junction:
  def __init__(self):
    self.size = []
    self.ratio = []
    self.norm_ratio = []
    
class Segment:
  def __init__(self, sequence):
    self.sequence = sequence
    self.V=[]
    self.D=[]
    self.J=[]
    
      
if len(sys.argv) < 4:
  print "incorect number of argument ( minimum 4 )"
  print "fuse.py -output_file- -top_limit- -input_file1- -input_file2- ... -input_fileX-"
  sys.exit() 
  
  
output_name=sys.argv[1]
output_limit=sys.argv[2]

jlist1 = []
jlist2 = []
 
#serialiseur perso, convertit un objet python en json
def juncToJson(obj):
  if isinstance(obj, Junctions):
    return {"junctions": obj.junctions,
      "total_size": obj.total_size,
      "time": obj.time,
      }
    raise TypeError(repr(obj) + " fail !") 
  if isinstance(obj, Junction):
    return {"junction": obj.junction,
      "size": obj.size,
      "ratio": obj.ratio,
      "norm_ratio": obj.norm_ratio,
      "seg": obj.segment,
      "top": obj.top
      }
    raise TypeError(repr(obj) + " fail !") 
  if isinstance(obj, Segment):
    return {"name": obj.name,
      "sequence": obj.sequence,
      "V": obj.V,
      "D": obj.D,
      "J": obj.J,
      "l1": obj.l1,
      "l2": obj.l2,
      "r1": obj.r1,
      "r2": obj.r2,
      "Nsize": obj.Nsize
      }
    raise TypeError(repr(obj) + " fail !") 

#deserialiseur perso, convertit un format json en objet python correspondant
def jsonToJunc(obj_dict):
  if "total_size" in obj_dict:
    obj = Junctions()
    obj.junctions=obj_dict["junctions"]
    obj.total_size=obj_dict["total_size"]
    return obj
  if "junction" in obj_dict:
    obj = Junction()
    obj.junction=obj_dict["junction"]
    obj.size=obj_dict["size"]
    obj.ratio=obj_dict["ratio"]
    obj.norm_ratio=obj_dict["norm_ratio"]
    obj.top=obj_dict["top"]
    if "seg" in obj_dict :
      obj.segment=obj_dict["seg"]
    else :
      obj.segment = 0
    return obj
  if "sequence" in obj_dict:
    obj = Segment(obj_dict["sequence"])
    obj.name=obj_dict["name"]
    obj.V=obj_dict["V"]
    obj.l1=obj_dict["l1"]
    obj.l2=obj_dict["l2"]
    obj.r1=obj_dict["r1"]
    obj.r2=obj_dict["r2"]
    obj.Nsize=obj_dict["Nsize"]
    if "D" in obj_dict:
      obj.D=obj_dict["D"]
    obj.J=obj_dict["J"]
    return obj

    
def cutList(l1, limit):
  
  out = Junctions()
  out.total_size=l1.total_size
  
  length1 = len(l1.junctions)
  
  for index in range(length1): 
    if (int(l1.junctions[index].top) < int(limit) or limit == 0) :
      out.junctions.append(l1.junctions[index])

  print limit
  return out
  
    
def fuseList(l1, l2, limit): 
  dico_size = collections.OrderedDict()
  dico_top = collections.OrderedDict()
  dico_norm_ratio = collections.OrderedDict()
  dico_ratio = collections.OrderedDict()
  
  dataseg = {}
  tampon=[]
  s=len(l1.total_size)
  for i in range(s):
    tampon.append(0)
  
  tampon2=[]
  s2=len(l2.total_size)
  for i in range(s2):
    tampon2.append(0)
  
  length1 = len(l1.junctions)
    
  length2 = len(l2.junctions)
  
  #recuperation des quantites de jonctions de la liste 1
  for index in range(length1): 
    dico_size[l1.junctions[index].junction] = l1.junctions[index].size
    dico_ratio[l1.junctions[index].junction] = l1.junctions[index].ratio
    dico_norm_ratio[l1.junctions[index].junction] = l1.junctions[index].norm_ratio
    dico_top[l1.junctions[index].junction] = l1.junctions[index].top
    if (l1.junctions[index].segment != 0) :
      dataseg[l1.junctions[index].junction] = l1.junctions[index].segment
    
  for index in range(length2): 
    
    if (l2.junctions[index].segment != 0) :
      if not l2.junctions[index].junction in dataseg :
	dataseg[l2.junctions[index].junction] = l2.junctions[index].segment
      else :
	#si les 2 listes ont des donnees de segmentation pour une meme jonction
	#on garde les donnees de segmentation de la liste possedant le point de suivi le plus haut
	if ( max (l2.junctions[index].size) > max (dico_size[l2.junctions[index].junction]) ) :
	  dataseg[l2.junctions[index].junction] = l2.junctions[index].segment
	  
	  
    #cas ou la jonction n'etait pas presente dans la 1ere liste
    if l2.junctions[index].junction not in dico_size:
      dico_size[l2.junctions[index].junction] = tampon + l2.junctions[index].size
      dico_norm_ratio[l2.junctions[index].junction] = tampon + l2.junctions[index].norm_ratio
      dico_ratio[l2.junctions[index].junction] = tampon + l2.junctions[index].ratio
      dico_top[l2.junctions[index].junction] = l2.junctions[index].top
    else :
      dico_size[l2.junctions[index].junction] = dico_size[l2.junctions[index].junction] + l2.junctions[index].size
      dico_norm_ratio[l2.junctions[index].junction] = dico_norm_ratio[l2.junctions[index].junction] + l2.junctions[index].norm_ratio
      dico_ratio[l2.junctions[index].junction] = dico_ratio[l2.junctions[index].junction] + l2.junctions[index].ratio
      if (dico_top[l2.junctions[index].junction] > l2.junctions[index].top) :
	dico_top[l2.junctions[index].junction] = l2.junctions[index].top
    
  #cas ou la jonction n'etait presente que dans la 1ere liste
  for index in range(length1): 
    if len(dico_size[l1.junctions[index].junction]) == s :
      dico_size[l1.junctions[index].junction] += tampon2
      dico_norm_ratio[l1.junctions[index].junction] += tampon2
      dico_ratio[l1.junctions[index].junction] += tampon2
  
  out = Junctions()
  out.total_size=l1.total_size+l2.total_size    
  
  #creation de la nouvelle liste de jonction
  for key in dico_size :
    junct=Junction()
    junct.junction=key
    junct.size=dico_size[key]
    junct.ratio=dico_ratio[key]
    junct.norm_ratio=dico_norm_ratio[key]
    junct.top=dico_top[key]
    junct.segment = 0
    if key in dataseg :
      junct.segment = dataseg[key]
    if (junct.top < limit or limit == 0) :
      out.junctions.append(junct)

  return out
  

with open(sys.argv[3], "r") as file:
  jlist1 = json.load(file, object_hook=jsonToJunc)       
  
  print jlist1
  
for index in range(len(sys.argv) - 4):
  
  with open(sys.argv[index+4], "r") as file2:
    jlist2 = json.load(file2, object_hook=jsonToJunc)      
    
  jlist1= fuseList(jlist1, jlist2, 0)

jlist1=cutList(jlist1,output_limit)

for index in range(len(sys.argv) - 3):
  path_name=sys.argv[index+3]
  split=path_name.split("/");
  
  file_name=split[len(split)-1]
  split=file_name.split(".");
  name=split[0]
  jlist1.time.append(name);
  
with open(output_name+".json", "w") as file:
  json.dump(jlist1, file, indent=2, default=juncToJson)
