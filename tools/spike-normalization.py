#!/usr/bin/env python
# -*- coding: utf-8 -*-

''' Program to perform spike-in normalization in .vidjil files.

    Developed at the Boldrini Center, Brazil, in 2018.
'''

############################################################
### imports

from __future__ import print_function
import sys
import json
import os
import math

############################################################
### constants

version = 'B0.01.03'
UNIVERSAL = 'universal'

############################################################
### routines


def linearRegression(y, x):
    '''
    function for curve fitting y = ax
    just slope, no intercept, to force (0,0)
    '''
    lr = {}
    n = len(y)
    assert(n == len(x))
    lr['n'] = n
    sum_x = 0.0
    sum_y = 0.0
    sum_xy = 0.0
    sum_xx = 0.0
    sum_yy = 0.0

    for i in range(n):

        sum_x += x[i]
        sum_y += y[i]
        sum_xy += (x[i]*y[i])
        sum_xx += (x[i]*x[i])
        sum_yy += (y[i]*y[i])

    lr['slope'] = sum_xy / sum_xx
    denom = (n*sum_xx-sum_x*sum_x)*(n*sum_yy-sum_y*sum_y)
    lr['r2'] = math.pow((n*sum_xy - sum_x*sum_y),2)/denom if denom > 0 else 'N/A'
    lr['s'] = math.sqrt((sum_yy - sum_xy*sum_xy/sum_xx)/n)
    
    return lr


def computeCopies(data):
    reads = {}
    copies = {}
    for clone in data['clones']:
        if 'label' in clone:
            ## spike-in clone
            label = clone['label']

            ## grab read data
            a = clone['reads']
            if len(a) > 1:
                print('  *** reads array with many elements', file=sys.stderr)

            ## add reads
            if label not in reads:
                reads[label] = 0.0
            reads[label] += a[0]

            ## set copies
            copies[label] = clone['copies']

    return copies, reads

############################################################

def computeUniversalCoefficient(copies, reads):
    '''
    curve-fitting
    skip computing f for each user family
    will do just universal coefficient
    '''

    f = {}
    r2 = {}
    perr = {}

    ### universal coefficient
    ### uses one point per copy number
    ### readsList is the list or read counts for each copy #
    readsList = {}
    for label in reads:
        nCopies = copies[label]
        if nCopies not in readsList:
            readsList[nCopies] = []
        readsList[nCopies].append(reads[label])

    ### x = copy number
    ### y = mean of reads for this copy number
    x = []
    y = []
    for nCopies in readsList:
        nReadsList = readsList[nCopies]
        s = sum(nReadsList)
        c = len(nReadsList)
        x.append(1.0*s/c)
        y.append(1.0*nCopies)
        ## print('{0:5} {1:10.1f}'.format(s/c, nCopies))

    ### test for zero items
    if len(x) == 0:
        print('** No spike-ins for universal coefficient **')
        print('** Please check input files **')
    else:
        ### fit curve
        lr = linearRegression(y, x)
        f[UNIVERSAL] = lr['slope']
        r2[UNIVERSAL] = lr['r2']
        perr[UNIVERSAL] = lr['s']
        if msgs >= 1:
            fmtStr = 'Universal coefficient estimation: {0} s: {1:.3%} r2: {2}'
            print(fmtStr.format(f[UNIVERSAL], perr[UNIVERSAL], r2[UNIVERSAL]), file=sys.stderr)

    return f

############################################################
### add normalized reads

def addNormalizedReads(data, f):
    if msgs >= 1:
        print('Normalizing reads and prinitng output file', file=sys.stderr)

    ### all clones will be normalized
    for clone in data['clones']:
        fam = UNIVERSAL

        ## grab read data
        a = clone['reads']
        if len(a) > 1:
            print('  *** reads array with many elements', file=sys.stderr)

        ## update counters for clones
        reads = a[0]
        clone['normalized_reads'] = [ reads*f[fam]/100000 ]

############################################################
### command line, initial msg

if __name__ == '__main__':
    inf = sys.argv[1]
    outf = sys.argv[2]
    msgs = 1 if len(sys.argv) >= 4 else 0

    # read input file
    if msgs >= 1:
        print('Reading follow-up file', file=sys.stderr)

    with open(inf) as inp:
        data = json.load(inp)

    # process data
    copies, reads = computeCopies(data)
    f = computeUniversalCoefficient(copies, reads)
    addNormalizedReads(data, f)

    # write output file
    with open(outf, 'w') as of:
        print(json.dumps(data, sort_keys=True, indent=2), file=of)
