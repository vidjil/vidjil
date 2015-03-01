'''Generates artificial VJ recombinations'''

from __future__ import print_function
import json
import fasta
import random

def recombine_VJ(seq5, remove5, N, remove3, seq3):
    name = "%s %d/%s/%d %s" % (seq5.name, remove5, N, remove3, seq3.name)
    seq = seq5.seq[:len(seq5)-remove5] + '\n' + N + '\n' + seq3.seq[remove3:]

    return fasta.Fasta(name, seq)

def select_genes(rep5, rep3, at_least=0):
    nb = 0
    for seq5 in rep5:
        yield (seq5, random.choice(rep3))
        nb += 1

    for seq3 in rep3:
        yield (random.choice(rep5), seq3)
        nb += 1

    while nb < at_least:
        yield (random.choice(rep5), random.choice(rep3))
        nb += 1


def generate_to_file(rep5, rep3, f, recomb_function):
    print("  ==>", f)

    with open(f, 'w') as ff:
        nb = 0
        for seq5, seq3 in select_genes(rep5, rep3):
            nb += 1
            seq = recomb_function(seq5, seq3)
            seq.header = seq.header.replace(' ', '_')
            ff.write(str(seq))

    print("  ==> %d recombinations" % nb)


germlines_json = open('germlines.data').read().replace('germline_data = ', '')
germlines = json.loads(germlines_json)


for code in germlines:
    g = germlines[code]
    print("--- %s - %-4s - %s"  % (g['shortcut'], code, g['description']))

    if '4' in g:
        continue

    # Read germlines

    rep5 = []
    for r5 in g['5']:
        rep5 += list(fasta.parse_as_Fasta(open(r5)))

    rep3 = []
    for r3 in g['3']:
        rep3 += list(fasta.parse_as_Fasta(open(r3)))

    print("      5: %3d sequences" % len(rep5),
          "      3: %3d sequences" % len(rep3))


    # Generate recombinations

    generate_to_file(rep5, rep3, '../data/gen/0-removes-%s.should-vdj.fa' % code,
                     (lambda seq5, seq3: recombine_VJ(seq5, 0, 'ATCG', 0, seq3)))

    print()
