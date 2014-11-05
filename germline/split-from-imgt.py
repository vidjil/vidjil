

import sys

# Parse lines in IMGT/GENE-DB such as:
# >M12949|TRGV1*01|Homo sapiens|ORF|...

open_files = {}
current_file = None

# Create isolated files for some sequences
SPECIAL_SEQUENCES = [
    'TRDD2*01',
    'TRDD3*01',
]

for l in sys.stdin:

    if ">" in l:
        current_file = None
        current_special = None

        if "Homo sapiens" in l and ("V-REGION" in l or "D-REGION" in l or "J-REGION" in l):
            seq = l.split('|')[1]
            system = seq[:4]

            if system.startswith('IG') or system.startswith('TR'):

                if system in open_files:
                    current_file = open_files[system]
                else:
                    name = '%s.fa' % system
                    print "  ==>", name
                    current_file = open(name, 'w')
                    open_files[system] = current_file

            if seq in SPECIAL_SEQUENCES:
                name = '%s.fa' % seq.replace('*', '-')
                print "  ==>", name
                current_special = open(name, 'w')


    if current_file:
            current_file.write(l)

    if current_special:
            current_special.write(l)

