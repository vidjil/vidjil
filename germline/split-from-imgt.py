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

NCBI_API = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=nuccore&rettype=fasta&retmode=text'+'&id=%s&from=%s&to=%s'

# Parse lines in IMGT/GENE-DB such as:
# >M12949|TRGV1*01|Homo sapiens|ORF|...


current_file = None

def verbose_open_w(name):
    print (" ==> %s" % name)
    return open(name, 'w')

class KeyDefaultDict(defaultdict):
    def __missing__(self, key):
        if self.default_factory is None:
            raise KeyError((key,))
        self[key] = value = self.default_factory(key)
        return value

open_files = KeyDefaultDict(lambda key: verbose_open_w('%s.fa' % key))


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
    >>> get_gene_coord(line)[1] == {'from': 406, 'to': 705, 'imgt_data': 'TRGV4*01|Homo sapiens|F|V-REGION', 'imgt_name': 'TRGV4*01'}
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
                             'imgt_name': elements[1],
                             'imgt_data': '|'.join(elements[1:5])}

def get_gene_sequence(gene, other_gene_name, start, end):
    '''
    Return the gene sequences between positions start and end (included).
    '''
    fasta_string = urllib.urlopen(NCBI_API % (gene, start, end)).read()
    return re.sub('(>\S*) ', r'\1|'+other_gene_name+'|', fasta_string)

def store_data_if_updownstream(fasta_header, path, data, genes):
    for gene in gene_matches(fasta_header, genes):
        gene_name, gene_coord = get_gene_coord(fasta_header)
        if gene_name:
            data[path+'/'+gene][gene_name].append(gene_coord)
    
def retrieve_genes(f, genes, tag, additional_length):
    for gene in genes:
        for coord in genes[gene]:
            start = coord['from']
            end = coord['to']
            if additional_length > 0:
                end += additional_length
            elif additional_length < 0:
                start = max(1, start + additional_length)
            gene_data = get_gene_sequence(gene, coord['imgt_data'] + tag, start, end)
            if coord['imgt_data'].split('|')[-1] == FEATURE_J_REGION:
                gene_lines = gene_data.split('\n')
                gene_lines[1] = gap_j(gene_lines[1].lower())
                gene_data = '\n'.join(gene_lines)

            f.write(gene_data)


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
  #                                 t..gg....gg.                               # Regexp
  #  .....ggaaggaaggaaacaggaaatttacatttggaatggggacgcaagtgagagtga               # TRAJ59*01 (ok)
  #  ,         'ctgagaggcgctgctgggcgtctgggcggaggactcctggttctgg':               # TRBJ2-2P*01 ?
  #  ,        'ctcctacgagcagtacgtcgggccgggcaccaggctcacggtcacag':               # TRBJ2-7*02 ?
}

def gap_j(seq):
    '''Gap J sequences in order to align the Phe118/Trp118 codon'''

    seqs = seq.strip()

    pos = None

    for custom_seq in CUSTOM_118:
        if not custom_seq:
            continue
        if seqs.startswith(custom_seq):
            print "# Custom 118 position in %s" % seqs
            pos = CUSTOM_118[custom_seq]

    if pos is None:
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

FEATURE_J_REGION = 'J-REGION'

FEATURES_VDJ = [ "V-REGION", "D-REGION", FEATURE_J_REGION ]
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

TAG_DOWNSTREAM='+down'
TAG_UPSTREAM='+up'

SPECIES = {
    "Homo sapiens": 'homo-sapiens/',
    "Mus musculus": 'mus-musculus/',
    "Mus musculus_BALB/c": 'mus-musculus/',
    "Mus musculus_C57BL/6": 'mus-musculus/',
    "Rattus norvegicus": 'rattus-norvegicus/',
    "Rattus norvegicus_BN/SsNHsdMCW": 'rattus-norvegicus/',
    "Rattus norvegicus_BN; Sprague-Dawley": 'rattus-norvegicus/'
}

downstream_data = defaultdict(lambda: defaultdict(list))
upstream_data = defaultdict(lambda: defaultdict(list))

for l in sys.stdin:

    # New sequence: compute 'current_files' and stores up/downstream_data[]

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
                    current_files.append(open_files[key])

            if seq in SPECIAL_SEQUENCES:
                name = '%s.fa' % seq.replace('*', '-')
                current_special = verbose_open_w(name)


    # Possibly gap J_REGION

    if '>' not in l and current_files and feature == FEATURE_J_REGION:
        l = gap_j(l)

    # Dump 'l' to the concerned files

    for current_file in current_files:
            current_file.write(l)

    if current_special:
            current_special.write(l)

    # End, loop to next 'l'


# Dump up/downstream data

for system in upstream_data:
    f = verbose_open_w(system + TAG_UPSTREAM + '.fa')
    retrieve_genes(f, upstream_data[system], TAG_UPSTREAM, -LENGTH_UPSTREAM)

for system in downstream_data:
    f = verbose_open_w(system + TAG_DOWNSTREAM + '.fa')
    retrieve_genes(f, downstream_data[system], TAG_DOWNSTREAM, LENGTH_DOWNSTREAM)
