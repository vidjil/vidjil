#!/usr/bin/env python
# -*- coding: utf-8 -*-


import fuse
import sys
import argparse

parser = argparse.ArgumentParser()
parser.add_argument('--threshold', '-t', type=float, default=0.1, help='threshold (%(default)d)')
parser.add_argument('--verbose', '-v', action='store_true', help='verbose output')
parser.add_argument('file', nargs='+', help='''.vidjil files''')




def main():

    args = parser.parse_args()
    datas = []

    for i in args.file:
        data = fuse.ListWindows()
        data.load(i, False, verbose = args.verbose)
        print '  ', i
        for w in data:
            if w.d['reads'][0] >= args.threshold:
                print w.latex()
        print r'  \hline'

if  __name__ =='__main__':
    main()




