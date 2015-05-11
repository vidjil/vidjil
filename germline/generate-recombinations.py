'''Generates artificial VJ recombinations'''

from __future__ import print_function
import json
import fasta
import random

random.seed(33328778554)

def recombine_VJ(seq5, remove5, N, remove3, seq3):
    name = "%s %d/%s/%d %s" % (seq5.name, remove5, N, remove3, seq3.name)
    seq = seq5.seq[:len(seq5)-remove5] + '\n' + N + '\n' + seq3.seq[remove3:]

    return fasta.Fasta(name, seq)


def random_sequence(characters, length):
    return ''.join([random.choice(characters) for x in range(length)])

def recombine_VJ_with_removes(seq5, remove5, Nlength, remove3, seq3):
    '''Recombine V and J with a random N, ensuring that the bases in N are not the same that what was ultimately removed from V or J'''
    assert(Nlength >= 1)

    available = ['A', 'C', 'G', 'T']
    if remove5:
        available.remove(seq5.seq[len(seq5)-remove5].upper())
    if remove3:
        c = seq3.seq[remove3-1].upper()
        if c in available:
            available.remove(c)

    return recombine_VJ(seq5, remove5, random_sequence(available, Nlength), remove3, seq3)

def get_gene_name(allele):
    '''
    From fasta sequence to Ig/TR gene name
    '''
    return allele.name[:allele.name.find('*')]

def select_genes(rep5, rep3, at_most=0):
    if at_most > 0 and len(rep5) * len(rep3) > at_most:
        return select_genes_randomly(rep5, rep3, at_most)
    return select_all_genes(rep5, rep3)

def select_all_genes(rep5, rep3):
    genes5 = {}
    genes3 = {}
    for seq5 in rep5:
        gene_name_5 = get_gene_name(seq5)
        if not gene_name_5 in genes5:
            genes5[gene_name_5] = True
            for seq3 in rep3:
                gene_name_3 = get_gene_name(seq3)
                if not gene_name_5+gene_name_3 in genes3:
                    genes3[gene_name_5+gene_name_3] = True
                    yield (seq5, seq3)

def select_genes_randomly(rep5, rep3, at_most):
    nb = 0
    while nb < at_most:
        yield (random.choice(rep5), random.choice(rep3))
        nb += 1


def write_seq_to_file(seq, code, file):
    seq.header = seq.header.replace(' ', '_')+"__"+code
    file.write(str(seq))

def generate_to_file_rec(rep5, rep4, rep3, code, output, recomb_function):
    if rep4 == []:
        recomb1_left = rep5
    else:
        recomb1_left = rep4
    recomb1_right = rep3

    nb = 0
    for seq5, seq3 in select_genes(recomb1_left, recomb1_right):
        seq = recomb_function(seq5, seq3)
        if rep4 != []:
            nb += generate_to_file_rec(rep5, [], [seq], code, output, recomb_function)
        else:
            seq.header = seq.header.replace(' ', '_')+"__"+code
            output.write(str(seq))
            nb += 1
    return nb

def generate_to_file(rep5, rep4, rep3, code, f, recomb_function):
    print("  ==>", f)
    print("  ==> %d recombinations" % generate_to_file_rec(rep5, rep4, rep3, code, open(f, 'w'), recomb_function))



germlines_json = open('germlines.data').read().replace('germline_data = ', '')
germlines = json.loads(germlines_json)


for code in germlines:
    g = germlines[code]
    print("--- %s - %-4s - %s"  % (g['shortcut'], code, g['description']))

    # Read germlines

    rep5 = []
    for r5 in g['5']:
        rep5 += list(fasta.parse_as_Fasta(open(r5)))

    rep4 = []
    if '4' in g:
        for r4 in g['4']:
            rep4 += list(fasta.parse_as_Fasta(open(r4)))

    rep3 = []
    for r3 in g['3']:
        rep3 += list(fasta.parse_as_Fasta(open(r3)))

    print("      5: %3d sequences" % len(rep5),
          "      4: %3d sequences" % len(rep4),
          "      3: %3d sequences" % len(rep3))


    # Generate recombinations

    generate_to_file(rep5, rep4, rep3, code, '../data/gen/0-removes-%s.should-vdj.fa' % code,
                     (lambda seq5, seq3: recombine_VJ(seq5, 0, 'ATCG', 0, seq3)))

    generate_to_file(rep5, rep4, rep3, code, '../data/gen/5-removes-%s.should-vdj.fa' % code,
                     (lambda seq5, seq3: recombine_VJ_with_removes(seq5, 5, 4, 5, seq3)))

    print()
