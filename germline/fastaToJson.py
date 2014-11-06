import collections
import json
import sys
import time

    
if len(sys.argv) < 2:
    print "Usage: %s <FASTA input file> [JSON output file]" % sys.argv[0]
    sys.exit()
input_name = sys.argv[1]
output_name = ""

if len(sys.argv) >= 3:
    output_name = sys.argv[-1]


table = {}
identifiant = ""
sequence = ""
  
for i in range(1, len(sys.argv)-1) :
    fasta = open(sys.argv[i], "r")
    system = sys.argv[i].split('/')[-1].split('.')[0]

    table[system] = {}
    
    for ligne in fasta :
        ligne = ligne.rstrip('\n\r')
    
        if len(ligne) != 0 :
            if ligne[0]=='>' :
                if len(sequence)!=0 :
                    table[system][identifiant]=sequence
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
            table[system][identifiant]=sequence
    
    
    fasta.close()

if output_name != "":
    with open(output_name, "w") as file :
        file.write("germline = ")
        json.dump(table, file, indent=2, sort_keys=True)