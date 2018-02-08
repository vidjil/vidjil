'''Get status from TAPS, output stats as well as FAILED_TESTS_SH'''

from __future__ import print_function
import sys
import glob
from collections import defaultdict


TAPS = 'should-get-tests/*.tap'
FAILED_TESTS_SH = './failed-should-get-tests.sh'
TEST_COMMAND = 'sh should-to-tap.sh %s.should-get'

stats = defaultdict(int)

failed = open(FAILED_TESTS_SH, 'w')
failed.write('#!/bin/sh\n\n')

for tap in glob.glob('should-get-tests/*.tap'):
    ok = True
    for l in open(tap):
        if 'not ok' in l:
            ok = False
            break

    if not ok:
        failed.write(TEST_COMMAND % tap.replace('.tap', '') + '\n')
    stats[ok] += 1

failed.close()

print("=== %s " % TAPS,
      "--> %s ok, %s bad, %s total" % (stats[True], stats[False], stats[True] + stats[False]), end='')

if stats[False]:
    print(" --> %s" % FAILED_TESTS_SH)
    sys.exit(1)

print()

