'''Rough conversion from .gb to .should-vdj.fa'''

# python gb-to-should.py *.gb

import sys

def parse(stream):
    sys.stdout.write(">")

    phase = 0
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
            what = l.split('=')[1]
            if not 'TR' in what:
                continue
            sys.stdout.write(what + ' ')
            continue
    
        if phase == 2:
            seq = ''.join(l.split(' ')[1:])
            sys.stdout.write('\n' + seq)
            continue
        
    # print "! Not parsed:", l

    sys.stdout.write('\n\n')



for f in sys.argv:
    sys.stdout.write('#%s\n' % f)
    parse(open(f))
    
