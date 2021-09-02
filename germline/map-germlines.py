#!env python3

import glob
import fasta
import re
from collections import defaultdict

GERMLINES = glob.glob('homo-sapiens/IG*+*.fa') + glob.glob('homo-sapiens/TR*+*.fa')
POS = re.compile('[(]?(\d+)[.][.][(]?\d+[)]?[.][.](\d+)[)]?')

positions = defaultdict(lambda: defaultdict(list))

def tag(gene, ref, first, last):
    '''
    Remembers which positions on the genome are covered by a germline gene
    '''
    for i in range(min(first, last), max(first, last) + 1):
        if gene not in positions[ref][i]:
            positions[ref][i] += [gene]

def locus_map(genes):
    for g in genes:
        for header, seq in fasta.parse(fasta.verbose_open(g)):
            try:
                name = header.split('|')[1]
                ref, pos = (header.split('#')[1]).split('|')
                # print(ref, pos, name)

                m = POS.match(pos)
                assert(m)
                first = int(m.group(1))
                last = int(m.group(2))

                gene_without_allele = name.split('*')[0] if '*' in name else name
                tag(gene_without_allele, ref, first, last)

            except:
                print('!', header)


def show_overlaps():
    print('## Check for overlaps')
    for ref, pos in positions.items():
        print('==', ref)
        overlaps = defaultdict(list)
        for (i, genes) in pos.items():
            if len(genes) > 1:
                overlaps[' '.join(genes)] += [i]
    
        for (genes, ii) in overlaps.items():
            print('!! Overlap %s %d..%d between %s' % (ref, min(ii), max(ii), genes))


locus_map(GERMLINES)
show_overlaps()