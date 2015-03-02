'''Give stats on a set of tap files'''

from __future__ import print_function
import sys

def stats(label, good, bad):
    total = good + bad
    ratio = '%5.2f%%' % (float(good*100)/total) if total else ''

    print("%-40s good %4d/%4d  %8s   bad %4d" %
          (label, good, total, ratio, bad))

bad_total = 0
good_total = 0

for f in sys.argv[1:]:

    bad = 0
    good = 0

    for l in open(f):
        if 'not ok ' in l:
            bad += 1
            bad_total += 1
        elif 'ok ' in l:
            good += 1
            good_total +=1

    stats(f, good, bad)

stats('===', good_total, bad_total)
