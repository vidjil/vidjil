import collections
import json
import sys
 
 
class Junction:
  def __init__(self):
    self.size = []
    
class Segment:
  def __init__(self, sequence):
    self.sequence = sequence
    self.V=[]
    self.D=[]
    self.J=[]
    


path1=sys.argv[1]
path2=sys.argv[2]

jlist1 = []
jlist2 = []
 
#serialiseur perso, convertit un objet python en json
def juncToJson(obj):
  if isinstance(obj, Junction):
    return {"junction": obj.junction,
      "size": obj.size,
      "seg": obj.segment
      }
    raise TypeError(repr(obj) + " fail !") 
  if isinstance(obj, Segment):
    return {"name": obj.name,
      "sequence": obj.sequence,
      "V": obj.V,
      "D": obj.D,
      "J": obj.J
      }
    raise TypeError(repr(obj) + " fail !") 

#deserialiseur perso, convertit un format json en objet python correspondant
def jsonToJunc(obj_dict):
  
  if "junction" in obj_dict:
    obj = Junction()
    obj.junction=obj_dict["junction"]
    obj.size=obj_dict["size"]
    if "seg" in obj_dict :
      obj.segment=obj_dict["seg"]
    else :
      obj.segment = 0
    return obj
  if "sequence" in obj_dict:
    obj = Segment(obj_dict["sequence"])
    obj.name=obj_dict["name"]
    obj.V=obj_dict["V"]
    if "D" in obj_dict:
      obj.D=obj_dict["D"]
    obj.J=obj_dict["J"]
    return obj

def fuseList(l1, l2): 
  dico = collections.OrderedDict()
  dataseg = {}
  tampon=[]
  s=len(l1[0].size)
  for i in range(s):
    tampon.append(0)
  
  #recuperation des quantites de jonctions de la liste 1
  for index in range(len(l1)): 
    dico[l1[index].junction] = l1[index].size
    if (l1[index].segment != 0) :
      dataseg[l1[index].junction] = l1[index].segment
    
    
  for index in range(len(l2)): 
    
    if (l2[index].segment != 0) :
      if not l2[index].junction in dataseg :
	dataseg[l2[index].junction] = l2[index].segment
      else :
	#si les 2 listes ont des donnees de segmentation pour une meme jonction
	#on garde les donnees de segmentation de la liste possedant le point de suivi le plus haut
	if ( max (l2[index].size) > max (dico[l2[index].junction]) ) :
	  dataseg[l2[index].junction] = l2[index].segment
	  
	  
    #cas ou la jonction n'etait pas presente dans la 1ere liste
    if l2[index].junction not in dico:
      dico[l2[index].junction] = tampon + l2[index].size
    else :
      dico[l2[index].junction] += l2[index].size
    
  #cas ou la jonction n'etait presente que dans la 2eme liste
  for index in range(len(l1)): 
    if len(dico[l1[index].junction]) == s :
      dico[l1[index].junction] += [0]
  
  out = []
  
  #creation de la nouvelle liste de jonction
  for key in dico :
    junct=Junction()
    junct.junction=key
    junct.size=dico[key]
    junct.segment = 0
    if key in dataseg :
      junct.segment = dataseg[key]
    out.append(junct)
    print dico[key]
  return out
  
  
with open(path1, "r") as file:
  jlist1 = json.load(file, object_hook=jsonToJunc)       
  
with open(path2, "r") as file2:
  jlist2 = json.load(file2, object_hook=jsonToJunc)      
  
newList= fuseList(jlist1, jlist2);

with open("junction.json", "w") as file:
  json.dump(newList, file, default=juncToJson)

