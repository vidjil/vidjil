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
    self.reads_total = []
    self.reads_segmented = []
    self.normalization_factor = []
    self.time = []
    self.windows = []
    self.clones = []

  def __str__(self):
    return "<windows %s: %s %s %d>" % (self.time, self.reads_total, self.reads_segmented, len(self.windows))
 
class Window:
  def __init__(self):
    self.size = []
    self.V = []
    self.D = []
    self.J = []
    self.infos = {}
    
jlist1 = []
jlist2 = []
 
#serialiseur perso, convertit un objet python en json
### TODO: mettre cela en methode ListWindows.save_json()
def juncToJson(obj):
	if isinstance(obj, ListWindows):
		return {"windows": obj.windows,
		"normalization_factor": obj.normalization_factor,
		"reads_total": obj.reads_total,
		"reads_segmented": obj.reads_segmented,
		"time": obj.time,
		"timestamp": obj.timestamp,
		"germline": obj.germline,
		"clones" :obj.clones
		}
		raise TypeError(repr(obj) + " fail !") 
	if isinstance(obj, Window):
		if hasattr(obj, 'name'):
			return {
			"sequence": obj.sequence,
			"window": obj.window,
			"size": obj.size,
			"top": obj.top,
			"V": obj.V,
			"D": obj.D,
			"J": obj.J,
			"name": obj.name,
			"Vend": obj.l1,
			"Dstart": obj.r2,
			"Dend": obj.l2,
			"Jstart": obj.r1,
			"Nlength": obj.Nsize,
                        "infos": obj.infos
			}
		return {
			"sequence": obj.sequence,
			"window": obj.window,
			"size": obj.size,
			"top": obj.top
		}
		raise TypeError(repr(obj) + " fail !") 


#deserialiseur perso, convertit un format json en objet python correspondant
### TODO: mettre cela en methode ListWindows.load_json()
def jsonToJunc(obj_dict):
  if "reads_total" in obj_dict:
    obj = ListWindows()
    obj.normalization_factor=obj_dict["normalization_factor"]
    obj.windows=obj_dict["windows"]
    obj.reads_total=obj_dict["reads_total"]
    obj.reads_segmented=obj_dict["reads_segmented"]
    obj.timestamp=obj_dict["timestamp"]
    obj.germline=obj_dict["germline"]
    return obj
    
  if "window" in obj_dict:
    obj = Window()
    obj.sequence=obj_dict["sequence"]
    obj.window=obj_dict["window"]
    obj.size=obj_dict["size"]
    obj.top=obj_dict["top"]
    if "name" in obj_dict:
		obj.name=obj_dict["name"]
		obj.V=obj_dict["V"]
		obj.J=obj_dict["J"]
		obj.l1=obj_dict["Vend"]
		obj.r1=obj_dict["Jstart"]
		obj.Nsize=obj_dict["Nlength"]
		if "D" in obj_dict:
			obj.D=obj_dict["D"]
                        obj.l2=obj_dict["Dstart"]
                        obj.r2=obj_dict["Dend"]
                else:
                        ## TODO: Temporary hack, should work even without these variables
                        obj.D = []
                        obj.l2 = 0
                        obj.r2 = 0
    return obj


### TODO: methode .load_clntab()    
def clntabParser(file_path):
	
	out = ListWindows()
	
	out.timestamp = "1970-01-01 00:00:00"
	out.normalization_factor = [1]
	
	listw = []
	listc = []
	total_size = 0
	
	fichier = open(file_path,"r")
	for ligne in fichier:
		if "clonotype" in ligne:
			header_map = ligne.split('\t')
			
		else :
			if "IGH" in ligne:
				out.germline = "IGH"
			elif "TRG" in ligne :
				out.germline = "TRG"
			else :
				out.germline = "???"
				
	
                        tab = {}
                        for index, data in enumerate(ligne.split('\t')):
                            tab[header_map[index]] = data

                        print tab
			
			w=Window()
                        w.infos = tab ## On verra si on ne conserve pas tout plus tard

			#w.window=tab["sequence.seq id"]	#use sequence id as window for .clntab data
			w.window=tab["sequence.raw nt seq"]	#use sequence as window for .clntab data
			s = int(tab["sequence.size"])
			total_size += s
			w.size=[ s ]

			w.sequence = tab["sequence.raw nt seq"]
			w.V=tab["sequence.V-GENE and allele"].split('=')
			if (tab["sequence.D-GENE and allele"] != "") :
				w.D=tab["sequence.D-GENE and allele"].split('=')
			w.J=tab["sequence.J-GENE and allele"].split('=')

                        # use sequence.JUNCTION to colorize output (this is not exactly V/J !)
                        junction = tab["sequence.JUNCTION.raw nt seq"]
                        position = w.sequence.find(junction)
                        if position >= 0:
                          w.r1 = position
                          w.l1 = position + len(junction)
                          w.Nsize = len(junction)
                        else:
                          w.r1 = 0
                          w.l1 = len(w.sequence)
                          w.Nsize = 0
                        
			w.name=w.V[0] + " -x/y/-z " + w.J[0]
			w.l2=0
			w.r2=0

			listw.append((w , w.size[0]))
			
			clonotype = tab["clonotype"].split(' ')
			if (clonotype[0]!="") :
				listc.append((w , clonotype[0]))
			
	#sort by sequence_size
	listw = sorted(listw, key=itemgetter(1), reverse=True)
    #sort by clonotype
	listc = sorted(listc, key=itemgetter(1))
	
	#generate data "top"
	for index in range(len(listw)):
		listw[index][0].top=index+1
		out.windows.append(listw[index][0])
		
	
	#cluster / clonotype
	clone = {}
	clone["name"] = listc[0][1]
	clone["cluster"] = []
	clonotype_name = clone["name"]
	
	for index in range(len(listc)):
		
		if (clonotype_name != listc[index][1]):
			out.clones.append(clone)
			clone = {}
			clone["name"] = listc[index][1]
			clone["cluster"] = []
			clonotype_name = listc[index][1]
		clone["cluster"].append(listw[index][0].window)
	out.clones.append(clone)
	
	out.reads_segmented = [total_size]
	return out
    
    
def cutList(l1, limit):
  
  length1 = len(l1.windows)
  w=[]
  
  for index in range(length1): 
    if (int(l1.windows[index].top) < limit or limit == 0) :
      w.append(l1.windows[index])

  l1.windows=w

  print "! cut to %d" % limit
  return l1
  

### code difficilement lisible
### TODO, methode ListWindows.__add__(self, other) 
### et surtout, separer de cela une methode Windows.__add__(self, other) qui fait l'ajout de 2 windows
### il ne devrait y avoir ni tampon, ni dataseg...

def fuseList(l1, l2, limit): 

  if l1 is None:
    return l2

  dico_size = collections.OrderedDict()
  dico_top = collections.OrderedDict()
  dico_ratios = collections.OrderedDict()
  
  dataseg = {}
  tampon=[]
  s=len(l1.reads_segmented)
  
  for i in range(s):
    tampon.append(0)
  
  tampon2=[]
  s2=len(l2.reads_segmented)
  for i in range(s2):
    tampon2.append(0)
  
  length1 = len(l1.windows)
    
  length2 = len(l2.windows)
  
  #recuperation des quantites de jonctions de la liste 1
  for index in range(length1): 
    dico_size[l1.windows[index].window] = l1.windows[index].size
    dico_top[l1.windows[index].window] = l1.windows[index].top
    if (l1.windows[index].V) :
      dataseg[l1.windows[index].window] = l1.windows[index]
    
  for index in range(length2): 
    
    if (l2.windows[index].V) :
      if not l2.windows[index].window in dataseg :
	dataseg[l2.windows[index].window] = l2.windows[index]
      else :
	#si les 2 listes ont des donnees de segmentation pour une meme jonction
	#on garde les donnees de segmentation de la liste possedant le point de suivi le plus haut
	if ( max (l2.windows[index].size) > max (dico_size[l2.windows[index].window]) ) :
	  dataseg[l2.windows[index].window] = l2.windows[index]

    #cas ou la jonction n'etait pas presente dans la 1ere liste
    if l2.windows[index].window not in dico_size:
      dico_size[l2.windows[index].window] = tampon + l2.windows[index].size
      dico_top[l2.windows[index].window] = l2.windows[index].top
    else :
      dico_size[l2.windows[index].window] = dico_size[l2.windows[index].window] + l2.windows[index].size
      if (dico_top[l2.windows[index].window] > l2.windows[index].top) :
	dico_top[l2.windows[index].window] = l2.windows[index].top
    
  #cas ou la jonction n'etait presente que dans la 1ere liste
  for index in range(length1): 
    if len(dico_size[l1.windows[index].window]) == s :
      dico_size[l1.windows[index].window] += tampon2
  
  out = ListWindows()
  out.normalization_factor=l1.normalization_factor+l2.normalization_factor
  out.reads_total=l1.reads_total+l2.reads_total    
  out.reads_segmented=l1.reads_segmented+l2.reads_segmented    
  out.clones=l1.clones+l2.clones    
  out.germline=l1.germline
  
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
    junct.top=dico_top[key]
    junct.sequence = 0;
    if key in dataseg :
                ## TODO: on doit juste recopier l'objet, pas tous les champs un a un...
		junct.sequence = dataseg[key].sequence
		junct.name=dataseg[key].name
		junct.V=dataseg[key].V
		junct.J=dataseg[key].J
		junct.l1=dataseg[key].l1
		junct.l2=dataseg[key].l2
		junct.r1=dataseg[key].r1
		junct.r2=dataseg[key].r2
		junct.Nsize=dataseg[key].Nsize
		junct.D=dataseg[key].D
                junct.infos = dataseg[key].infos
      
    if (junct.top < limit or limit == 0) :
      out.windows.append(junct)

  return out
  
  
  
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
			
    else :
		print "\n ERROR .", extension, " invalid file extension"
		sys.exit()
        
    # Merge lists
    jlist_fused = fuseList(jlist_fused, jlist, 0)
    # Store short name
    times.append(name)

print

jlist_fused = cutList(jlist_fused, args.max_clones)
jlist_fused.time = times
print jlist_fused 
  
print "==>", args.output
with open(args.output, "w") as file:
    json.dump(jlist_fused, file, indent=2, default=juncToJson)
