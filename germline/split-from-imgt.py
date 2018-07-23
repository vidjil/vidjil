#!/usr/bin/env python
# -*- coding: utf-8 -*-


import sys
import os
import urllib
from collections import defaultdict, OrderedDict
import re

import ncbi

GENES_SEQ_FROM_NCBI = False

IMGT_LICENSE = '''
   # To use the IMGT germline databases (IMGT/GENE-DB), you have to agree to IMGT license: 
   # academic research only, provided that it is referred to IMGT®,
   # and cited as "IMGT®, the international ImMunoGeneTics information system® 
   # http://www.imgt.org (founder and director: Marie-Paule Lefranc, Montpellier, France). 
   # Lefranc, M.-P., IMGT®, the international ImMunoGeneTics database,
   # Nucl. Acids Res., 29, 207-209 (2001). PMID: 11125093
'''

def remove_allele(name):
    return name.split('*')[0]

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
        if match != None:
            results.append(match.group(0))
    return results

def get_gene_coord(imgt_line):
    '''
    >>> line = '>X15272|TRGV4*01|Homo sapiens|F|V-REGION|406..705|300 nt|1| | | | |300+0=300| |rev-compl|'
    >>> get_gene_coord(line)[0] == 'X15272'
    True
    >>> get_gene_coord(line)[1] == {'from': 406, 'to': 705, 'imgt_data': 'TRGV4*01|Homo sapiens|F|V-REGION', 'imgt_name': 'TRGV4*01', 'species': 'Homo sapiens', 'seq': ''}
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
                             'species': elements[2],
                             'imgt_name': elements[1],
                             'imgt_data': '|'.join(elements[1:5]),
                             'seq': ''}

def paste_updown_on_fasta(fasta, up, down):
    '''
    Put upstream and/or downstream data on an existing FASTA sequences
    >>> paste_updown_on_fasta('>seq\\nAAAAAAAAAAAAAAAAAAA\\nTTTTTTTTTTT', 'CCCC', 'GGGG')
    '>seq\\nCCCC\\nAAAAAAAAAAAAAAAAAAA\\nTTTTTTTTTTT\\nGGGG\\n'
    >>> paste_updown_on_fasta('>seq\\nAAAAAAAAAAAAAAAAAAA\\nTTTTTTTTTTT\\n', '', 'GGGG')
    '>seq\\nAAAAAAAAAAAAAAAAAAA\\nTTTTTTTTTTT\\nGGGG\\n'
    >>> paste_updown_on_fasta('>seq\\nAAAAAAAAAAAAAAAAAAA\\nTTTTTTTTTTT', 'CCCC', '')
    '>seq\\nCCCC\\nAAAAAAAAAAAAAAAAAAA\\nTTTTTTTTTTT\\n'
    '''
    lines = fasta.split('\n')
    return lines[0]+'\n' + (up+'\n' if up else '') + '\n'.join(filter(None, lines[1:])) + '\n'\
        + (down+'\n' if down else '')

def check_imgt_ncbi_consistency(imgt_info, imgt_data, ncbi_target, ncbi_start, ncbi_end):
    if abs(imgt_info['from'] - imgt_info['to']) != abs(ncbi_start - ncbi_end):
        print >>sys.stderr,"WARNING: Length for %s differ between IMGT (%d) and NCBI (%d)" % (imgt_info['imgt_name'], abs(imgt_info['from'] - imgt_info['to'])+1, abs(ncbi_start - ncbi_end)+1)
    else:
        # Check that sequences are identical
        ncbi_seq = ncbi.get_gene_sequence(ncbi_target, '', ncbi_start, ncbi_end, 0).split('\n')[1:]
        gene_lines = imgt_data.split('\n')[1:]
        if gene_lines[0].startswith('#'):
            gene_lines = gene_lines[1:]
        imgt_seq = ''.join(gene_lines).upper().replace('.', '')
        ncbi_seq = ''.join(ncbi_seq).upper()
        if imgt_seq != ncbi_seq:
            print >>sys.stderr, "WARNING: Sequences for %s differ between IMGT and NCBI\n%s" % (imgt_info['imgt_name'], imgt_seq)
            for i, letter in enumerate(ncbi_seq):
                if letter == imgt_seq[i]:
                    sys.stderr.write('.')
                else:
                    sys.stderr.write(letter)
            sys.stderr.write('\n')

def store_data_if_updownstream(fasta_header, path, data, genes):
    paths = []                  # A given sequence can be stored in several files
    for gene in gene_matches(fasta_header, genes):
        gene_name, gene_coord = get_gene_coord(fasta_header)

        if gene_name:
            data[path+'/'+gene].append((gene_name, gene_coord))
            paths.append(path+'/'+gene)
    return paths

def ignore_strand(start, end):
    if start < end:
        return (start, end)
    return (end, start)

def compute_updownstream_length(genes, default_length):
    positions = [ ignore_strand(info[1]['target_start'], info[1]['target_end']) for info in genes if 'target_start' in info[1]]
    positions = list(set(positions))
    positions.sort()
    i = 0
    min_length = default_length
    sign = - 1 if min_length < 0 else 1
    while i < len(positions) - 1:
        last = positions[i][1]
        first_next = positions[i+1][0]
        diff = first_next - last - 1
        if diff < abs(min_length):
            min_length = diff * sign
        i += 1
        # Should we divide by 2 the length so that we don't have overlaps
        # between up and downstream?
    return min_length


def retrieve_genes(f, genes, tag, additional_length, gene_list):
    for info in genes:
        (gene, coord) = info
        # try to extract from genome
        gene_id = gene_list.get_gene_id_from_imgt_name(coord['species'], coord['imgt_name'])

        allele_additional_length = 0
        
        if gene_id:
            try:
                (target, start, end) = ncbi.get_gene_positions(gene_id)
                coord['target'] = target
                coord['target_start'] = start
                coord['target_end'] = end
                coord['gene_id'] = gene_id
            except KeyError:
                print('! No positions for %s (%s: %s)' % (gene_id, gene, str(coord)))

    min_updownstream = compute_updownstream_length(genes, additional_length)

        # gene: is the name of the sequence where the VDJ gene was identified according to IMGT. The gene is just a part of the sequence
        # gene_id: is the NCBI ID of the VDJ gene
        # target: is the NCBI ID of the chromosome

    for info in genes:
        (gene, coord) = info

        gene_id = coord['gene_id'] if 'gene_id' in coord else None

        if GENES_SEQ_FROM_NCBI:
            gene_data = ncbi.get_gene_sequence(gene, coord['imgt_data'] + tag, coord['from'], coord['to'], min_updownstream)
        else:
            # IMGT
            gene_data = coord['seq']

        if gene_id:
            # Check consistency for *01 allele
            if coord['imgt_name'].endswith('*01'):
                check_imgt_ncbi_consistency(coord, gene_data, coord['target'], coord['target_start'],
                                            coord['target_end'])
            up_down = ncbi.get_updownstream_sequences(coord['target'], coord['target_start'],
                                                      coord['target_end'], min_updownstream)
            # We put the up and downstream data before and after the sequence we retrieved previously
            gene_data = paste_updown_on_fasta(gene_data, up_down[0], up_down[1])


        # post-process gene_data
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
        m = j118.search(seq, re.IGNORECASE)

        if not m:
            if len(seq) > PHE_TRP_WARN_SIZE:
                print "# %s in %s" % (PHE_TRP_WARN_MSG, seq)
                seq = "# %s\n%s" % (PHE_TRP_WARN_MSG, seq)
            return seq

        pos = m.start() + 1 # positions start at 1

    return (MAX_GAP_J - pos) * '.' + seq


LENGTH_UPSTREAM=200
LENGTH_DOWNSTREAM=200
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
    "Rattus norvegicus_BN; Sprague-Dawley": 'rattus-norvegicus/',
    "Gallus gallus": "gallus-gallus/",
    "Gallus gallus_Red Jungle fowl": "gallus-gallus/"
}


class OrderedDefaultListDict(OrderedDict):
    def __missing__(self, key):
        self[key] = value = []
        return value



class IMGTGENEDBGeneList():
    '''
    Parse lines such as
    'Homo sapiens;TRGJ2;F;Homo sapiens T cell receptor gamma joining 2;1;7;7p14;M12961;6969;'

    >>> gl = IMGTGENEDBGeneList('IMGTGENEDB-GeneList')
    >>> gl.get_gene_id_from_imgt_name('Homo sapiens', 'TRGJ2*01')
    '6969'
    '''

    def __init__(self, f):

        self.data = defaultdict(str)

        for l in open(f):
            ll = l.split(';')
            species, name, gene_id = ll[0], ll[1], ll[-2]
            self.data[species, name] = gene_id

    def get_gene_id_from_imgt_name(self, species, name):
        return self.data[species, remove_allele(name)]



def split_IMGTGENEDBReferenceSequences(sources, gene_list):

    downstream_data = OrderedDefaultListDict()
    upstream_data = OrderedDefaultListDict()

    processed_keys = []

    for source in sources:
      print()
      print()
      print('<== %s' % source)
      for l in open(source):

        # New sequence: compute 'current_files' and stores up/downstream_data[]

        if ">" in l:
            current_files = []
            current_special = None
            key_upstream, key_downstream = ([], [])

            species = l.split('|')[2].strip()
            feature = l.split('|')[4].strip()

            if species in SPECIES and feature in FEATURES:
                seq = l.split('|')[1]

                # Check whether this sequence was already retrieven from a previous source
                key = '%s %s %s' % (species, seq, feature)
                if key in processed_keys:
                    continue
                processed_keys.append(key)

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
                        key_downstream = store_data_if_updownstream(l, path, downstream_data, DOWNSTREAM_REGIONS)
                        key_upstream = store_data_if_updownstream(l, path, upstream_data, UPSTREAM_REGIONS)

                    systems = get_split_files(seq, SPLIT_SEQUENCES)
                    if systems:
                        keys = [path + s for s in systems]
                    for key in keys:
                        current_files.append(open_files[key])

                if seq in SPECIAL_SEQUENCES:
                    name = '%s.fa' % seq.replace('*', '-')
                    current_special = verbose_open_w(name)


        for key in key_downstream:
            downstream_data[key][-1][1]['seq'] += l
        for key in key_upstream:
            upstream_data[key][-1][1]['seq'] += l


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
        retrieve_genes(f, upstream_data[system], TAG_UPSTREAM, -LENGTH_UPSTREAM, gene_list)

    for system in downstream_data:
        f = verbose_open_w(system + TAG_DOWNSTREAM + '.fa')
        retrieve_genes(f, downstream_data[system], TAG_DOWNSTREAM, LENGTH_DOWNSTREAM, gene_list)





if __name__ == '__main__':

    if sys.argv[1] == '--test':
        import doctest
        doctest.testmod()
    else:
        print (IMGT_LICENSE)

        ReferenceSequencesInframe = sys.argv[1]
        ReferenceSequencesAll = sys.argv[2]
        GeneList = sys.argv[3]

        gl = IMGTGENEDBGeneList(GeneList)
        split_IMGTGENEDBReferenceSequences([ReferenceSequencesInframe, ReferenceSequencesAll], gl)
    
