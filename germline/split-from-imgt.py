#!/usr/bin/env python
# -*- coding: utf-8 -*-


import sys
import os

IMGT_LICENSE = '''
   # To use the IMGT germline databases (IMGT/GENE-DB), you have to agree to IMGT license: 
   # academic research only, provided that it is referred to IMGT®,
   # and cited as "IMGT®, the international ImMunoGeneTics information system® 
   # http://www.imgt.org (founder and director: Marie-Paule Lefranc, Montpellier, France). 
   # Lefranc, M.-P., IMGT®, the international ImMunoGeneTics database,
   # Nucl. Acids Res., 29, 207-209 (2001). PMID: 11125093
'''

print IMGT_LICENSE


# Parse lines in IMGT/GENE-DB such as:
# >M12949|TRGV1*01|Homo sapiens|ORF|...

open_files = {}
current_file = None

def verbose_open_w(name):
    print " ==> %s" % name
    return open(name, 'w')

def get_split_files(seq, split_seq):
    for s_seq in split_seq.keys():
        if seq.find(s_seq) > -1:
            return split_seq[s_seq]
    return []

def check_directory_exists(path):
    if not(os.path.isdir(path)):
        os.mkdir(path)

# Create isolated files for some sequences
SPECIAL_SEQUENCES = [
]

# Split sequences in several files
SPLIT_SEQUENCES = {'/DV': ['TRAV', 'TRDV']}

SPECIES = {
    "Homo sapiens": './', 
    "Mus musculus": 'mus-musculus/',
}

for l in sys.stdin:

    if ">" in l:
        current_files = []
        current_special = None

        species = l.split('|')[2].strip()

        if species in SPECIES and ("V-REGION" in l or "D-REGION" in l or "J-REGION" in l):
            seq = l.split('|')[1]
            path = SPECIES[species]
            system = seq[:4]
            keys = [path + system]

            check_directory_exists(path)

            if system.startswith('IG') or system.startswith('TR'):

                systems = get_split_files(seq, SPLIT_SEQUENCES)
                if systems:
                    keys = [path + s for s in systems]
                for key in keys:
                    if not (key in open_files):
                        name = '%s.fa' % (key)
                        open_files[key] = verbose_open_w(name)
                    current_files.append(open_files[key])

            if seq in SPECIAL_SEQUENCES:
                name = '%s.fa' % seq.replace('*', '-')
                current_special = verbose_open_w(name)


    for current_file in current_files:
            current_file.write(l)

    if current_special:
            current_special.write(l)

