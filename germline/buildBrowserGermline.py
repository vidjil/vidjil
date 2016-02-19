import json
import sys

    
if len(sys.argv) < 3:
    print("Usage: %s <FASTA input files> [JSON/DATA germline file] [JSON output file]" % sys.argv[0])
    sys.exit()
input_name = sys.argv[1]
output_name = ""

if len(sys.argv) >= 4:
    output_name = sys.argv[-1]
    data_file = sys.argv[-2]


table = {}
identifiant = ""
sequence = ""
  
for i in range(1, len(sys.argv)-2) :
    fasta = open(sys.argv[i], "r")
    system = sys.argv[i].split('/')[-1].split('.')[0]

    table[system] = {}
    
    for ligne in fasta :
        ligne = ligne.rstrip('\n\r')
    
        if ligne:
            if ligne[0]=='>' :
                identifiant=ligne[1:]
            
                if '|' in identifiant:
                    identifiant = identifiant.split('|')[1]
                
                if '_' in identifiant:
                    identifiant = identifiant.split('_')[0]
                    
                sequence = ""
            else :
                sequence+=ligne
        
        if sequence:
            # If there is still some sequence left, this value will be overwritten in the next pass
            table[system][identifiant]=sequence

    fasta.close()



if output_name:
    with open(output_name, "w") as file :
        file.write("germline = ")
        json.dump(table, file, indent=2, sort_keys=True)
        
        data = open(data_file, "r")
        file.write( "\n\n" )
        file.write("germline_data = ")
        file.write( data.read() )
