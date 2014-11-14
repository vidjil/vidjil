'''Statistics on .vidjil.log files'''

import glob
from collections import defaultdict


def sort_except_fixed_order(l, fixed_order=[]):
    ll = filter(lambda x: x not in fixed_order, l)
    return fixed_order + sorted(ll)
        
GERMLINES = [
    'TRA', 'TRB', 'TRG', 'TRD',
    'IGH', 'IGK', 'IGL',
    'custom'
    ]

FILES = glob.glob('web2py/out-0*/*.vidjil.log')

print "=== Stats from %d files ===" % len(FILES)

d = defaultdict(int)

for f in FILES:
    for l in open(f):
        l = l.strip()
        if not l:
            continue

        sep = '->'
        if not sep in l:
            continue

        cause, stats = l.split(sep)
        cause = cause.strip()
        nb = int(stats.split()[0])

        d[cause] += nb


for cause in sort_except_fixed_order(d, GERMLINES):
    print "    %-25s %12d" % (cause, d[cause])

