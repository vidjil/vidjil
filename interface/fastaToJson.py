import collections
import json
import sys
import time

if len(sys.argv) < 2:
  print "Usage: %s <FASTA input file> [JSON output file]" % sys.argv[0]
  sys.exit()
input_name = sys.argv[1]
output_name = ""

if len(sys.argv) == 3:
  output_name = sys.argv[2]

fasta = open(sys.argv[1], "r")

table = {}
identifiant = ""
sequence = ""

for ligne in fasta :
  ligne = ligne.rstrip('\n\r')
  
  if len(ligne) != 0 :
    if ligne[0]=='>' :
      if len(sequence)!=0 :
	table[identifiant]=sequence
      identifiant=ligne[1:]
      
      if identifiant.count('|') != 0 :
	tmp=identifiant.split('|')
	identifiant=tmp[1]
      if identifiant.count('_') != 0 :
	tmp2=identifiant.split('_')
	identifiant=tmp2[0]
      sequence="";
    else :
      sequence+=ligne
      
if len(sequence)!=0 :
  table[identifiant]=sequence
  
  
fasta.close()
print json.dumps(table, indent=2, sort_keys=True)
if output_name != "":
  with open(output_name, "w") as file :
    json.dump(table, file, indent=2, sort_keys=True)

