import collections
import json
import sys
import time
 
 
class Windows:
  def __init__(self):
    self.total_size = []
    self.normalizations = []
    self.resolution1 = []
    self.resolution5 = []
    self.time = []
    self.windows = []

  def __str__(self):
    return "<windows %s: %s %d>" % (self.time, self.total_size, len(self.windows))
 
class Window:
  def __init__(self):
    self.size = []
    self.ratios = []
    
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
output_limit = int(sys.argv[2])
input_names = sys.argv[3:]

jlist1 = []
jlist2 = []
 
#serialiseur perso, convertit un objet python en json
def juncToJson(obj):
  if isinstance(obj, Windows):
    return {"windows": obj.windows,
      "normalizations": obj.normalizations,
      "total_size": obj.total_size,
      "resolution1": obj.resolution1,
      "resolution5": obj.resolution5,
      "time": obj.time,
      "timestamp": obj.timestamp
      }
    raise TypeError(repr(obj) + " fail !") 
  if isinstance(obj, Window):
    return {"window": obj.window,
      "size": obj.size,
      "ratios": obj.ratios,
      "seg": obj.segment,
      "top": obj.top
      }
    raise TypeError(repr(obj) + " fail !") 
  if isinstance(obj, Segment):
    if hasattr(obj, 'name'):
      return {
	"sequence": obj.sequence,
	"V": obj.V,
	"D": obj.D,
	"J": obj.J,
	"name": obj.name,
	"l1": obj.l1,
	"l2": obj.l2,
	"r1": obj.r1,
	"r2": obj.r2,
	"Nsize": obj.Nsize
	}
    return {
      "sequence": obj.sequence
      }
    raise TypeError(repr(obj) + " fail !") 

#deserialiseur perso, convertit un format json en objet python correspondant
def jsonToJunc(obj_dict):
  if "total_size" in obj_dict:
    obj = Windows()
    obj.normalizations=obj_dict["normalizations"]
    obj.windows=obj_dict["windows"]
    obj.total_size=obj_dict["total_size"]
    obj.resolution1=obj_dict["resolution1"]
    obj.resolution5=obj_dict["resolution5"]
    obj.timestamp=obj_dict["timestamp"]
    
    return obj
  if "window" in obj_dict:
    obj = Window()
    obj.window=obj_dict["window"]
    obj.size=obj_dict["size"]
    obj.ratios=obj_dict["ratios"]
    obj.top=obj_dict["top"]
    if "seg" in obj_dict :
      obj.segment=obj_dict["seg"]
    else :
      obj.segment = 0
    return obj
  if "sequence" in obj_dict:
    obj = Segment(obj_dict["sequence"])
    if "name" in obj_dict:
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
  
  out = Windows()
  out.normalizations=l1.normalizations
  out.total_size=l1.total_size
  out.resolution1=l1.resolution1
  out.resolution5=l1.resolution5
  out.timestamp=l1.timestamp
  
  length1 = len(l1.windows)
  
  for index in range(length1): 
    if (int(l1.windows[index].top) < limit or limit == 0) :
      out.windows.append(l1.windows[index])

  print "! cut to %d" % limit
  return out
  
    
def fuseList(l1, l2, limit): 

  if l1 is None:
    return l2

  dico_size = collections.OrderedDict()
  dico_top = collections.OrderedDict()
  dico_ratios = collections.OrderedDict()
  
  dataseg = {}
  tampon=[]
  s=len(l1.total_size)
  
  tp=[]
  
  for i in l1.normalizations:
    tp.append(0)
  
  for i in range(s):
    tampon.append(tp)
  
  tampon2=[]
  s2=len(l2.total_size)
  for i in range(s2):
    tampon2.append(tp)
  
  length1 = len(l1.windows)
    
  length2 = len(l2.windows)
  
  #recuperation des quantites de jonctions de la liste 1
  for index in range(length1): 
    dico_size[l1.windows[index].window] = l1.windows[index].size
    dico_ratios[l1.windows[index].window] = l1.windows[index].ratios
    dico_top[l1.windows[index].window] = l1.windows[index].top
    if (l1.windows[index].segment != 0) :
      dataseg[l1.windows[index].window] = l1.windows[index].segment
    
  for index in range(length2): 
    
    if (l2.windows[index].segment != 0) :
      if not l2.windows[index].window in dataseg :
	dataseg[l2.windows[index].window] = l2.windows[index].segment
      else :
	#si les 2 listes ont des donnees de segmentation pour une meme jonction
	#on garde les donnees de segmentation de la liste possedant le point de suivi le plus haut
	if ( max (l2.windows[index].size) > max (dico_size[l2.windows[index].window]) ) :
	  dataseg[l2.windows[index].window] = l2.windows[index].segment
	  
	  
    #cas ou la jonction n'etait pas presente dans la 1ere liste
    if l2.windows[index].window not in dico_size:
      dico_size[l2.windows[index].window] = tampon + l2.windows[index].size
      dico_ratios[l2.windows[index].window] = tampon + l2.windows[index].ratios
      dico_top[l2.windows[index].window] = l2.windows[index].top
    else :
      dico_size[l2.windows[index].window] = dico_size[l2.windows[index].window] + l2.windows[index].size
      dico_ratios[l2.windows[index].window] = dico_ratios[l2.windows[index].window] + l2.windows[index].ratios
      if (dico_top[l2.windows[index].window] > l2.windows[index].top) :
	dico_top[l2.windows[index].window] = l2.windows[index].top
    
  #cas ou la jonction n'etait presente que dans la 1ere liste
  for index in range(length1): 
    if len(dico_size[l1.windows[index].window]) == s :
      dico_size[l1.windows[index].window] += tampon2
      dico_ratios[l1.windows[index].window] += tampon2
  
  out = Windows()
  out.normalizations=l1.normalizations
  out.total_size=l1.total_size+l2.total_size    
  out.resolution1=l1.resolution1+l2.resolution1
  out.resolution5=l1.resolution5+l2.resolution5
  
  timestamp1= time.strptime(l1.timestamp, "%Y-%m-%d %H:%M:%S")
  timestamp2= time.strptime(l2.timestamp, "%Y-%m-%d %H:%M:%S")
  if timestamp1>timestamp2 :
    out.timestamp=l1.timestamp
  else :
    out.timestamp=l2.timestamp
  
  #creation de la nouvelle liste de jonction
  for key in dico_size :
    junct=Window()
    junct.window=key
    junct.size=dico_size[key]
    junct.ratios=dico_ratios[key]
    junct.top=dico_top[key]
    junct.segment = 0
    if key in dataseg :
      junct.segment = dataseg[key]
    if (junct.top < limit or limit == 0) :
      out.windows.append(junct)

  return out
  

jlist_fused = None
times = []

for path_name in input_names:

    # Compute short name
    split=path_name.split("/");
    name="";
    if (len(split)>1):
        name = split[len(split)-2]
    else:
        name = path_name

    name = name.replace('.fa', '')
    name = name.replace('_BCD', '')

    print "<==", path_name, "\t", name, "\t", 

    with open(path_name, "r") as file:
        jlist = json.load(file, object_hook=jsonToJunc)       
        print jlist

    # Merge lists
    jlist_fused = fuseList(jlist_fused, jlist, 0)

    # Store short name
    times.append(name)

print

jlist_fused = cutList(jlist_fused, output_limit)
jlist_fused.time = times
print jlist_fused 
  
print "==>", output_name
with open(output_name, "w") as file:
    json.dump(jlist_fused, file, indent=2, default=juncToJson)
