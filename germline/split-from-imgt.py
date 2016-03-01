#!/usr/bin/env python
# -*- coding: utf-8 -*-


import sys
import os
import urllib
from collections import defaultdict
import re

IMGT_LICENSE = '''
   # To use the IMGT germline databases (IMGT/GENE-DB), you have to agree to IMGT license: 
   # academic research only, provided that it is referred to IMGT®,
   # and cited as "IMGT®, the international ImMunoGeneTics information system® 
   # http://www.imgt.org (founder and director: Marie-Paule Lefranc, Montpellier, France). 
   # Lefranc, M.-P., IMGT®, the international ImMunoGeneTics database,
   # Nucl. Acids Res., 29, 207-209 (2001). PMID: 11125093
'''

print (IMGT_LICENSE)

NCBI_API = 'http://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=nuccore&rettype=fasta&retmode=text'+'&id=%s&from=%s&to=%s'

# Parse lines in IMGT/GENE-DB such as:
# >M12949|TRGV1*01|Homo sapiens|ORF|...

open_files = {}
current_file = None

def verbose_open_w(name):
    print (" ==> %s" % name)
    return open(name, 'w')

def get_split_files(seq, split_seq):
    for s_seq in split_seq.keys():
        if seq.find(s_seq) > -1:
            return split_seq[s_seq]
    return []

def check_directory_exists(path):
    if not(os.path.isdir(path)):
        os.mkdir(path)

def gene_matches(string, list_regex):
    '''
    >>> gene_matches('>M994641|IGHD1-18*01|Toto', ['TRGV', 'IGHD'])
    ['IGHD']
    >>> gene_matches('>M994641|IGHD1-18*01|Toto', ['TRGV', 'TRGD'])
    []
    >>> gene_matches('>M994641|IGHJ4*01|Toto', ['[A-Z]{3}J'])
    ['IGHJ']
    >>> gene_matches('>M22153|TRDD2*01|Homo sapiens|F|', ['TRDD', 'IGH', 'TRDD2'])
    ['TRDD', 'TRDD2']
    '''
    results = []
    for regex in list_regex:
        match = re.search(regex, string)
        if match <> None:
            results.append(match.group(0))
    return results

def get_gene_coord(imgt_line):
    '''
    >>> line = '>X15272|TRGV4*01|Homo sapiens|F|V-REGION|406..705|300 nt|1| | | | |300+0=300| |rev-compl|'
    >>> get_gene_coord(line)[0] == 'X15272'
    True
    >>> get_gene_coord(line)[1] == {'from': 406, 'to': 705, 'imgt_name': 'TRGV4*01'}
    True
    '''
    elements = imgt_line.split('|')
    assert len(elements) >= 6
    if elements[5].find('..') == -1:
        return None, None
    start, end = elements[5].split('..')
    if start.find(',') > -1:
        start = start[2:]
    if end.find(',') > -1:
        end = end.split(',')[0]
    return elements[0][1:], {'from': int(start),
                             'to': int(end),
                             'imgt_name': elements[1]}

def get_gene_sequence(gene, other_gene_name, start, end):
    '''
    Return the gene sequences between positions start and end (included).
    '''
    fasta_string = urllib.urlopen(NCBI_API % (gene, start, end)).read()
    return re.sub('(>g.\|)', r'\1'+other_gene_name+'|', fasta_string)

def store_data_if_updownstream(fasta_header, path, data, genes):
    for gene in gene_matches(fasta_header, genes):
        gene_name, gene_coord = get_gene_coord(fasta_header)
        if gene_name:
            data[path+'/'+gene][gene_name].append(gene_coord)
    
def retrieve_genes(filename, genes, additional_length):
    file = verbose_open_w(filename)
    for gene in genes:
        for coord in genes[gene]:
            start = coord['from']
            end = coord['to']
            if additional_length > 0:
                end += additional_length
            elif additional_length < 0:
                start = max(1, start + additional_length)
            file.write(get_gene_sequence(gene, coord['imgt_name'], start, end))


#                  Phe
#                  TrpGly   Gly
j118 = re.compile('t..gg....gg.')


MAX_GAP_J = 36          # maximal position of Phe/Trp (36 for TRAJ52*01)
PHE_TRP_WARN_SIZE = 15  # small sequences are on a second line
PHE_TRP_WARN_MSG = 'No Phe/Trp-Gly-X-Gly pattern'

CUSTOM_118 = { '': 0    # custom position of 118 in sequences without the Trp-Gly-X-Gly pattern
    #                               118
    #                               |..
    ,                       'gcacatgtttggcagcaagacccagcccactgtctta':         8 # IGLJ-C/OR18*01
    ,    'ggttttcagatggccagaagctgctctttgcaaggggaaccatgttaaaggtggatctta':    27 # TRAJ16*01
    , 'agatgcgtgacagctatgagaagctgatatttggaaaggagacatgactaactgtgaagc':       30 # TRAJ51*01
    ,    'ggtaccgggttaataggaaactgacatttggagccaacactagaggaatcatgaaactca':    27 # TRAJ61*01
    ,       'ataccactggttggttcaagatatttgctgaagggactaagctcatagtaacttcacctg': 24 # TRGJP1*01
    ,       'atagtagtgattggatcaagacgtttgcaaaagggactaggctcatagtaacttcgcctg': 24 # TRGJP2*01
  #  ,         'ctgagaggcgctgctgggcgtctgggcggaggactcctggttctgg':               # TRBJ2-2P*01 ?
  #  ,        'ctcctacgagcagtacgtcgggccgggcaccaggctcacggtcacag':               # TRBJ2-7*02 ?
}

def gap_j(seq):
    '''Gap J sequences in order to align the Phe118/Trp118 codon'''

    seqs = seq.strip()

    if seqs in CUSTOM_118:
        print "# Custom 118 position in %s" % seq
        pos = CUSTOM_118[seqs]
        seq =  seq.replace('\n', " # Custom\n")

    else:
        m = j118.search(seq)

        if not m:
            if len(seq) > PHE_TRP_WARN_SIZE:
                print "# %s in %s" % (PHE_TRP_WARN_MSG, seq)
                seq = "# %s\n%s" % (PHE_TRP_WARN_MSG, seq)
            return seq

        pos = m.start() + 1 # positions start at 1

    return (MAX_GAP_J - pos) * '.' + seq


LENGTH_UPSTREAM=40
LENGTH_DOWNSTREAM=40
# Create isolated files for some sequences
SPECIAL_SEQUENCES = [
]

FEATURES_VDJ = [ "V-REGION", "D-REGION", "J-REGION" ]
FEATURES_CLASSES = [
    "CH1", "CH2", "CH3", "CH3-CHS", "CH4-CHS",
    "H", "H-CH2", "H1", "H2", "H3", "H4",
    "M", "M1", "M2",
]
FEATURES = FEATURES_VDJ + FEATURES_CLASSES

# Heavy-chain human IGH exons, ordered
CLASSES = [ "IGHA", "IGHM", "IGHD", "IGH2B", "IGHG3", "IGHG1", "IGHA1", "IGHG2", "IGHG4", "IGHE", "IGHA2",
            "IGHGP" ]

# Split sequences in several files
SPLIT_SEQUENCES = {'/DV': ['TRAV', 'TRDV']}

DOWNSTREAM_REGIONS=['[A-Z]{3}J', 'TRDD3']
UPSTREAM_REGIONS=['IGHD', 'TRDD', 'TRBD', 'TRDD2']
# Be careful, 'IGHD' regex for UPSTREAM_REGIONS also matches IGHD*0? constant regions.

SPECIES = {
    "Homo sapiens": './', 
    "Mus musculus": 'mus-musculus/',
    "Rattus norvegicus": 'rattus-norvegicus/',
    "Rattus norvegicus_BN/SsNHsdMCW": 'rattus-norvegicus/',
}

downstream_data = defaultdict(lambda: defaultdict(list))
upstream_data = defaultdict(lambda: defaultdict(list))

for l in sys.stdin:

    if ">" in l:
        current_files = []
        current_special = None

        species = l.split('|')[2].strip()
        feature = l.split('|')[4].strip()

        if species in SPECIES and feature in FEATURES:
            seq = l.split('|')[1]
            path = SPECIES[species]

            if feature in FEATURES_VDJ:
                system = seq[:4]
            else:
                system = seq[:seq.find("*")]
                if not system in CLASSES:
                    print "! Unknown class: ", system
                system = system.replace("IGH", "IGHC=")

            keys = [path + system]

            check_directory_exists(path)

            if system.startswith('IG') or system.startswith('TR'):

                if feature in FEATURES_VDJ:
                    store_data_if_updownstream(l, path, downstream_data, DOWNSTREAM_REGIONS)
                    store_data_if_updownstream(l, path, upstream_data, UPSTREAM_REGIONS)

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


    if '>' not in l and current_files and feature == 'J-REGION':
        l = gap_j(l)

    for current_file in current_files:
            current_file.write(l)

    if current_special:
            current_special.write(l)

for system in upstream_data:
    retrieve_genes(system+"_upstream.fa", upstream_data[system], -LENGTH_UPSTREAM)
for system in downstream_data:
    retrieve_genes(system+"_downstream.fa", downstream_data[system], LENGTH_DOWNSTREAM)
