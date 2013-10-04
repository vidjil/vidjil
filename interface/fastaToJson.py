import collections
import json
import sys
import time

input_name = sys.argv[1]
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
      sequence="";
    else :
      sequence+=ligne
  table[identifiant]=sequence
  
fasta.close()

print json.dumps(table, indent=2, sort_keys=True)

with open(output_name, "w") as file :
  json.dump(table, file, indent=2, sort_keys=True)

