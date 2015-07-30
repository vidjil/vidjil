#!/usr/bin/env python
# -*- coding: utf-8 -*-

from __future__ import print_function
import fuse
import sys
import argparse
import re

parser = argparse.ArgumentParser(description = 'Output a LaTeX table for clones in .vidjil files')
parser.add_argument('--min-ratio', '-r', type=float, default=.01, help='minimal reads ratio of the clone (%(default).3f)')
parser.add_argument('--min', '-m', type=int, default=1, help='minimal number of reads in the clone (%(default)d)')
parser.add_argument('--top', '-t', type=int, default=5, help='maximal number of clones to displlay (%(default)d)')
parser.add_argument('--verbose', '-v', action='store_true', help='verbose output')
parser.add_argument('file', nargs='+', help='''.vidjil files''')


# data.vidjil/pat-0119--PAR--sched-0900...
regex_filename = re.compile('.*pat-(.*)--sched')

def main():

    print('%%%%', ' '.join(sys.argv))
    args = parser.parse_args()
    datas = []

    for i in args.file:
        data = fuse.ListWindows()
        data.load(i, False, verbose = args.verbose)

        m = regex_filename.match(i)
        i_short = m.group(1) if m else i

        print('%s %% %s' % (i_short, i))
        print('%%  ', data.d["reads"])
        segmented_reads = data.d['reads'].d['segmented'][0]

        out = []
        for w in data:
            reads = w.d['reads'][0]
            ratio = float(reads)/segmented_reads
            if reads >= args.min and ratio >= args.min_ratio:
                out += [(-reads, w)]
        for bla, w in sorted(out[:args.top]):
            print(w.latex(base=segmented_reads))
        if not out:
            print(r'\\')

        print(r'  \hline')

if  __name__ =='__main__':
    main()


