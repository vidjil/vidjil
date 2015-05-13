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
    'IGHD'
    >>> gene_matches('>M994641|IGHD1-18*01|Toto', ['TRGV', 'TRGD'])
    None
    >>> gene_matches('>M994641|IGHJ4*01|Toto', ['[A-Z]{3}J'])
    'IGHJ'
    >>> gene_matches('>M22153|TRDD2*01|Homo sapiens|F|', ['TRDD2'])
    'TRDD2'
    '''
    for regex in list_regex:
        match = re.search(regex, string)
        if match <> None:
            return match.group(0)
    return None

def get_gene_coord(imgt_line):
    '''
    >>> line = '>X15272|TRGV4*01|Homo sapiens|F|V-REGION|406..705|300 nt|1| | | | |300+0=300| |rev-compl|'
    >>> get_gene_coord(line) == 'X15272', {'from': 406, 'to': 705, 'imgt_name': 'TRGV4*01'}
    True
    '''
    elements = imgt_line.split('|')
    assert len(elements) >= 6
    start, end = elements[5].split('..')
    return elements[0][1:], {'from': int(start),
                             'to': int(end),
                             'imgt_name': elements[1]}

def get_gene_sequence(gene, other_gene_name, start, end):
    '''
    Return the gene sequences between positions start and end (included).
    '''
    fasta_string = urllib.urlopen(NCBI_API % (gene, start, end)).read()
    return re.sub('(>g.\|)', r'\1'+other_gene_name+'|', fasta_string)

def retrieve_genes(filename, genes, additional_length):
    file = verbose_open_w(filename)
    for gene in genes:
        start = genes[gene]['from']
        end = genes[gene]['to']
        if additional_length > 0:
            end += additional_length
        elif additional_length < 0:
            start = max(1, start + additional_length)
        file.write(get_gene_sequence(gene, genes[gene]['imgt_name'], start, end))


LENGTH_UPSTREAM=40
LENGTH_DOWNSTREAM=40
# Create isolated files for some sequences
SPECIAL_SEQUENCES = [
]

# Split sequences in several files
SPLIT_SEQUENCES = {'/DV': ['TRAV', 'TRDV']}

DOWNSTREAM_REGIONS=['[A-Z]{3}J', 'TRDD3']
UPSTREAM_REGIONS=['IGHD', 'TRDD2']

SPECIES = {
    "Homo sapiens": './', 
    "Mus musculus": 'mus-musculus/',
    "Rattus norvegicus": 'rattus-norvegicus/',
    "Rattus norvegicus_BN/SsNHsdMCW": 'rattus-norvegicus/',
}

downstream_data = defaultdict(dict)
upstream_data = defaultdict(dict)

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

                if gene_matches(l, DOWNSTREAM_REGIONS):
                    downstream_data[path+'/'+system].update(get_gene_coord(l))
                if gene_matches(l, UPSTREAM_REGIONS):
                    upstream_data[path+'/'+system].update(get_gene_coord(l))

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

for system in upstream_data:
    retrieve_genes(system+"_upstream.fa", upstream_data[system], -LENGTH_UPSTREAM)
for system in downstream_data:
    retrieve_genes(system+"_downstream.fa", downstream_data[system], LENGTH_DOWNSTREAM)
