#!/usr/bin/env python
# -*- coding: utf-8 -*-

''' Program to perform spike-in normalization in .vidjil files.

    Developed at the Boldrini Center, Brazil, in 2018-2019.
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

version = 'S0.06'
UNI = 'UNI'                     # except Vidjil leaves cluster to user
NG600 = 100000                  # number of cells for 600ng of DNA
### maximum reads for a give spike-in allowed in diagnostic samples
DIAGMAX = 20.0

############################################################
### routines

############################################################
### function to get family name from clone name
### returns the longest alphanumeric prefix
def family(name):
    pos = 1
    while pos < len(name) and name[pos].isalnum():
        pos+=1
    return (name[:pos])

############################################################
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

############################################################

def prevalentGermline(germlines):
    reads = {}
    prevalent = ""
    for g in germlines:
        germline = g[0:3]
        if germline in reads:
            reads[germline] += germlines[g][0]
        else:
            reads[germline] = germlines[g][0]
        if prevalent == "" or reads[prevalent] < reads[germline]:
            prevalent = germline
    return prevalent, reads[prevalent]

############################################################
    
def spikeTable(data):
    reads = {}
    fams = {}
    ## get config
    spikes = data['config']['labels']
    
    ## find spikes in data, stamp name, and augment table
    for clone in data['clones']:
        if 'label' in clone:
            ## spike-in clone
            label = clone['label']
            if 'name' in clone:
                ## call family before changing clone name
                fams[label] = family(clone['name'])
                clone['name'] = label + ' ' + clone['name']
            else:
                ## add spike name to clone anyway
                clone['name'] = label
            ## grab read data
            a = clone['reads']
            if len(a) > 1:
                print('  *** reads array with many elements', file=sys.stderr)
            ## add reads
            if label not in reads:
                reads[label] = 0.0
            reads[label] += a[0]
    for spike in spikes:
        spike['reads'] = reads[spike['name']] if spike['name'] in reads else 0
        ## vfam stands for 'Vidjil family' 
        spike['vfam'] = fams[spike['name']] if spike['name'] in fams else spike['family']

    return spikes

############################################################

def computeCoefficients(spikes):
    '''
    curve-fitting
    computes f for each user family
    plus UNI coefficient
    if family not dense enough or Pearson < 0.8 use UNI
    plus SPIKE coefficient, used for spikes
    goal is to force sum of spikes = 100,000 - sum of non spikes
    '''

    coeff = {}
    r2 = {}
    perr = {}

    ### UNI coefficient (only if enough spikes)
    ### uses one point per copy number
    ### test for not enough items

    copyNos = list(set([int(spike['copies']) for spike in spikes]))
    avgReads = []
    if msgs >= 1:
        print('copyNos: ', copyNos)
    for copyNo in copyNos:
        reads = [ spike['reads'] for spike in spikes
                    if int(spike['copies']) == copyNo ]
        ## len(reads) is never zero because spike['copies'] is in copyNos
        avgReads.append(sum(reads)/len(reads))
    if msgs >= 1:
        print('avgReads: ', avgReads)
    if len(avgReads) == 0 or max(avgReads) <= DIAGMAX:
        ## not enough spikes; probably diagnostic sample
        print('** Not enough spike-ins **', file=sys.stderr)
        print('** No normalization performed **', file=sys.stderr)
    else:
        ### universal coefficient
        lr = linearRegression(copyNos, avgReads)
        coeff[UNI] = lr['slope']
        r2[UNI] = lr['r2']
        perr[UNI] = lr['s']
        if msgs >= 1:
            fmtStr = 'Uni coefficient estimation: {0:15.13f} s: {1:5.1f} r2: {2:15.13f}'
            print(fmtStr.format(coeff[UNI], perr[UNI], r2[UNI]), file=sys.stderr)

        ### family coefficients
        ### also use one point per copy number
        ### test for not enough points and r2 <= 0.8

        vfams = list(set([spike['vfam'] for spike in spikes]))
        if msgs >= 1:
            print('Vfams: {0}'.format(vfams))
        for vfam in vfams:
            copyNos = list(set([int(spike['copies']) for spike in spikes if spike['vfam'] == vfam]))
            reads = [ sum([ spike['reads'] for spike in spikes
                            if spike['vfam'] == vfam and int(spike['copies']) == copyNo])
                      for copyNo in copyNos ]
            if len(reads) <= 1 or max(reads) <= DIAGMAX:
                ## not enough points; use UNI coefficient
                coeff[vfam] = coeff[UNI]
                r2[vfam] = r2[UNI]
                perr[vfam] = perr[UNI]
            else:
                ### fit curve
                lr = linearRegression(copyNos, reads)
                coeff[vfam] = lr['slope']
                r2[vfam] = lr['r2']
                perr[vfam] = lr['s']
                if lr['r2'] <= 0.8:
                    ## r2 <= 0.8; use UNI cofficient
                    coeff[vfam] = coeff[UNI]
                    r2[vfam] = r2[UNI]
                    perr[vfam] = perr[UNI]
            if msgs >= 1:
                fmtStr = '{0} coefficient estimation: {1:15.13f} s: {2:5.1f} r2: {3:15.13f}'
                print(fmtStr.format(vfam, coeff[vfam], perr[vfam], r2[vfam]), file=sys.stderr)

    return coeff, r2

############################################################
### add normalized reads
###
### data: entire .vidjil JSON structure
### coeff: dict with normalization coefficients for each family
### r2: Pearson's r2 for each family
### spk: total number of spike-in reads

def addNormalizedReads(data, coeff, r2, spk):
    if msgs >= 1:
        print('Normalizing reads and prinitng output file', file=sys.stderr)

    data['coefficients'] = coeff
    ## find prevalent germine and sum of its reads
    prevalent, spg = prevalentGermline(data['reads']['germline'])
    data['samples']['prevalent'] = [ prevalent ]
    data['samples']['ampl_coeff'] = [ spg/spk ]
    data['samples']['UNI_R2'] = [ r2[UNI] ]
    ### normalize just clones from the prevalent germline
    for clone in data['clones']:
        ## grab read data
        a = clone['reads']
        if len(a) > 1:
            print('  *** reads array with many elements', file=sys.stderr)
        reads = a[0]
        if 'name' in clone:
            ## use UNI for unknown, unnamed or unsegmented families or reads
            fam = family(clone['name'])
            if fam not in coeff:
                ## unknown family or unsegmented clone
                fam = UNI
        else:
            ## unnamed clone
            fam = UNI
        if 'germline' in clone and clone['germline'][0:3] == prevalent:
            clone['copy_number'] = reads * coeff[fam]
            clone['normalized_reads'] = [ reads*coeff[fam]*spg/NG600 ]
            clone['R2'] = [ r2[fam] ]
            clone['family'] = [ fam ]

############################################################
### command line, initial msg

if __name__ == '__main__':
    inf = sys.argv[1]
    outf = sys.argv[2]
    msgs = 1 if len(sys.argv) >= 4 else 0

    # read input file
    if msgs >= 1:
        print('Reading input file', file=sys.stderr)

    with open(inf) as inp:
        data = json.load(inp)

    # process data
    spikes = spikeTable(data)
    spk = sum([spike['reads'] for spike in spikes])
    coeff, r2 = computeCoefficients(spikes)
    if coeff:
        addNormalizedReads(data, coeff, r2, spk)

    # write output file
    with open(outf, 'w') as of:
        print(json.dumps(data, sort_keys=True, indent=2), file=of)
