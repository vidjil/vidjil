#!/usr/bin/env python
# -*- coding: utf-8 -*-

from __future__ import print_function
import fuse
import analysis
import sys
import argparse
import re

parser = argparse.ArgumentParser(description = 'Output a LaTeX table for clones in .vidjil files')
parser.add_argument('--min-ratio', '-r', type=float, default=.01, help='minimal reads ratio of the clone (%(default).3f)')
parser.add_argument('--min', '-m', type=int, default=1, help='minimal number of reads in the clone (%(default)d)')
parser.add_argument('--top', '-t', type=int, default=5, help='maximal number of clones to display (%(default)d)')
parser.add_argument('--sample', '-s', type=int, default=0, help='sample number (%(default)d)')
parser.add_argument('--analysis', '-a', action='store_true', help='filter clones tagged in the relevant .analysis file (experimental, hardcoded)')

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

        if data.d['samples'].d['number'] < args.sample + 1:
            print("! no sample %d in %s'" % (args.sample, i))
            continue
        sample = args.sample

        m = regex_filename.match(i)
        i_short = m.group(1) if m else i

        if args.analysis:
            # TODO: hardcoded for output of links.py
            # should be more flexible
            ii = 'data.vidjil/' + 'pat-' + i_short +'.analysis'
            data_analysis = analysis.Analysis(data)
            data_analysis.load(ii)
            data_analysis.cluster_stats()

            if str(data_analysis.d['samples']['run_timestamp']) == str(data.d['samples'].d['run_timestamp']):
                print("%% timestamps: OK")
            else:
                print("%% timestamps: XXX", i, data.d['samples'].d['run_timestamp'], "instead of", data_analysis.d['samples']['run_timestamp'])
        else:
            data_analysis = None

        print('%s %% %s' % (i_short, i))
        print('%%  ', data.d["reads"])
        segmented_reads = data.d['reads'].d['segmented'][sample]

        out = []
        for w in data:
            if data_analysis:
                tag = data_analysis.tag_of_clone(w)
                if not tag:
                    continue
            else:
                tag = ''
            reads = w.d['reads'][sample]
            ratio = float(reads)/segmented_reads
            if reads >= args.min and ratio >= args.min_ratio:
                out += [(-reads, w, tag)]
        for bla, w, tag in sorted(out[:args.top]):
            segmented_reads_germline = data.d['reads'].d['germline'][w.d['germline']][sample]
            print(w.latex(base_germline=segmented_reads_germline, base=segmented_reads, tag=tag))
        if not out:
            print(r'\\')

        if data_analysis:
            for c in data_analysis.missing_clones(data):
                print('%% !! %s' % c)

        print(r'  \hline')

if  __name__ =='__main__':
    main()


