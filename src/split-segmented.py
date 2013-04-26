"""Split out/segmented.vdj.fa into new fake germline databases."""

import os
import sys

v = open('out/v.fa', 'w')
n = open('out/n.fa', 'w')
j = open('out/j.fa', 'w')

i = 0

for l in open('out/segmented.vdj.fa'):

    if (i % 4) == 0:
        v.write(l)
        n.write(l)
        j.write(l)

    if (i % 4) == 1:
        v.write(l)

    if (i % 4) == 2:
        n.write(l)

    if (i % 4) == 3:
        j.write(l)

    i += 1


os.system('wc -wl out/segmented.vdj.fa out/?.fa')



