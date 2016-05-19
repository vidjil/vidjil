'''Rough conversion from .gb to .should-vdj.fa'''

# python gb-to-should.py -t "[TRB+]" *Db*.gb
# python gb-to-should.py -t "[TRA+D]" *29*.gb

import sys

import argparse

parser = argparse.ArgumentParser(formatter_class=argparse.RawTextHelpFormatter)
parser.add_argument('--tag', '-t', default='', help='tag to add at the end of the header')
parser.add_argument('file', nargs='+', help='''.gb files''')

args = parser.parse_args()

def parse_gb(stream):
    phase = 0
    labels = []
    seqs = []

    for l in stream:

        l = l.strip()

        if l.startswith("FEATURES"):
            phase = 1
            continue
    
        if l == "ORIGIN":
            phase = 2
            continue
        
        if l == "//":
            phase = 3
            continue
        
        if not phase in [1, 2]:
            continue
    
        if phase == 1 and l.startswith('/label'):
            label = l.split('=')[1]
            if not 'TR' in label:
                continue
            labels += [label]
            continue
    
        if phase == 2:
            seq = ''.join(l.split(' ')[1:])
            seqs += [seq]
            continue
        
    # print "! Not parsed:", l

    return labels, seqs


def output_should_vdj(f, labels, seqs):
    f.write('>%s\n' % ' '.join(labels))
    f.write('%s\n\n' % '\n'.join(seqs))


for f in args.file:
    labels, seqs = parse_gb(open(f))

    if args.tag:
        labels += [ args.tag ]

    sys.stdout.write('#%s\n' % f)
    output_should_vdj(sys.stdout, labels, seqs)

