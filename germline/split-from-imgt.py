

import sys

# Parse lines in IMGT/GENE-DB such as:
# >M12949|TRGV1*01|Homo sapiens|ORF|...

open_files = {}
current_file = None

for l in sys.stdin:

    if ">" in l:
        current_file = None
        if "Homo sapiens" in l and ("V-REGION" in l or "D-REGION" in l or "J-REGION" in l):
            system = l.split('|')[1][:4]
            if system.startswith('IG') or system.startswith('TR'):

                if system in open_files:
                    current_file = open_files[system]
                else:
                    name = '%s.fa' % system
                    print "  ==>", name
                    current_file = open(name, 'w')
                    open_files[system] = current_file


    if current_file:
            current_file.write(l)



