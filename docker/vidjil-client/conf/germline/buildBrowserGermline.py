import json
import sys

def get_required_files(germlines_data):
    '''
    Parse the germlines data and get all the files that are required by that
    file.

    The function returns a list of the files (uniqueness is guaranteed)
    '''
    g_json = json.load(open(germlines_data, 'r'))
    path = g_json['path']
    germlines_json = g_json['systems']

    files = []
    for germline in germlines_json.keys():
        for recombination in germlines_json[germline]['recombinations']:
            for gene in ['5', '4', '3']:
                if gene in recombination:
                    for f in recombination[gene]:
                        f = path + '/' + f
                        if f not in files:
                            files.append(f)
    return files
    
if len(sys.argv) != 3:
    print("Usage: %s <JSON/DATA germline file> <JSON output file>" % sys.argv[0])
    sys.exit()

data_file = sys.argv[1]
output_name = sys.argv[2]


table = {}
identifiant = ""
sequence = ""

germline_files = get_required_files(data_file)

for current_file in germline_files:
    try:
        fasta = open(current_file, "r")
    except IOError as e:
        raise type(e),\
            type(e)(str(e) + '\nDid you forget to run ``make\'\' in the germline directory?\n'\
                    +'Otherwise, please tell us about the problem at contact@vidjil.org'),\
            sys.exc_info()[2]
    
    system = current_file.split('/')[-1].split('.')[0]

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



with open(output_name, "w") as file :
    file.write("germline = ")
    json.dump(table, file, indent=2, sort_keys=True)

    data = open(data_file, "r")
    file.write( "\n\n" )
    file.write("germline_data = ")
    file.write( data.read() )
