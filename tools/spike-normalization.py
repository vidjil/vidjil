#!/usr/bin/env python
# -*- coding: utf-8 -*-

''' Program to perform spike-in normalization in .vidjil files.

    Developed at the Boldrini Center, Brazil, in 2018-2020.
'''

############################################################
### imports

from __future__ import print_function
import sys
import json
import os
import math
import argparse

############################################################
### constants

version = 'S0.08'
UNI = 'UNI'                     # except Vidjil leaves cluster to user
NG600 = 100000                  # number of cells for 600ng of DNA
### maximum reads for a given spike-in allowed in diagnostic samples
DIAGMAX = 20.0

############################################################
### translation table: Vidjil family -> JSON family

family = {
    "IGHV1": "VH1",
    "IGHV2": "VH2",
    "IGHV3": "VH3",
    "IGHV4": "VH4",
    "IGHV5": "VH5",
    "IGHV6": "VH6",
    "IGHV7": "VH7",
    "IGKV1": "VK1",
    "IGKV2": "VK2",
    "IGKV3": "VK3",
    "IGLV1": "VL1",
    "IGLV2": "VL2",
    "TRDD2": "DD2",
    "TRDV1": "VD1",
    "TRDV2": "VD2",
    "TRDV3": "VD3",
    "TRGV1": "VGf1",
    "TRGV2": "VGf1",
    "TRGV3": "VGf1",
    "TRGV4": "VGf1",
    "TRGV5": "VGf1",
    "TRGV6": "VGf1",
    "TRGV7": "VGf1",
    "TRGV8": "VGf1",
    "TRGV9": "VG9",
    "TRGV10": "VG10",
    "TRGV11": "VG11",
    }

############################################################
### routines

############################################################
### function to get family name from clone name
### returns the longest alphanumeric prefix
def vidfam(name):
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
        germline = g[0:3] # fiable
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
    ## get config
    spikes = data['config']['labels']
    
    ## find spikes in data, stamp name, and augment table
    for clone in data['clones']:
        if 'label' in clone:
            ## spike-in clone
            label = clone['label']
            if 'name' in clone:
                ## change clone name
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
        ## 'label' in Vidjil file is 'name' is spike JSON
        spike['reads'] = reads[spike['name']] if spike['name'] in reads else 0
    if msgs >= 1:
        lastFam = ''
        for spike in sorted(spikes, key=lambda spk: spk['family']+" {0:03}".format(int(spk['copies']))):
            if spike['family'] != lastFam:
                print("=" * (30 + 1 + 7 + 1 + 4), file=sys.stderr)
            lastFam = spike['family']
            fmtStr = '{0:30} {1:7} {2:>4}'
            print(fmtStr.format(spike['name'], spike['reads'], spike['copies']), file=sys.stderr)
        print("=" * (30 + 1 + 7 + 1 + 4), file=sys.stderr)
    return spikes

############################################################

def computeCoefficients(spikes):
    '''
    curve-fitting
    computes f for each user family
    plus UNI coefficient
    if family not dense enough or Pearson < 0.8 use UNI
    '''

    coeff = {}
    r2 = {}
    perr = {}

    ### UNI coefficient (only if enough spikes)
    ### uses one point per copy number
    ### test for not enough items

    copyNos = list(set([int(spike['copies']) for spike in spikes]))
    avgReads = []
    if msgs:
        print('copyNos: ', copyNos)
    for copyNo in copyNos:
        reads = [ spike['reads'] for spike in spikes
                  if int(spike['copies']) == copyNo
        ]
        ## len(reads) is never zero because spike['copies'] is in copyNos
        avgReads.append(sum(reads)/len(reads))
    if msgs:
        print('avgReads: ', avgReads)
    if len(avgReads) == 0 or max(avgReads) <= DIAGMAX:
        ## not enough spikes; probably diagnostic sample
        print('** Not enough spike-ins **', file=sys.stderr)
        print('** No normalization performed **', file=sys.stderr)
    else:
        ### universal coefficient
        if msgs >= 2:
            fmtStr = 'UNI regression: {0} {1}'
            print(fmtStr.format(copyNos, avgReads), file=sys.stderr)
        lr = linearRegression(copyNos, avgReads)
        coeff[UNI] = lr['slope']
        r2[UNI] = lr['r2']
        perr[UNI] = lr['s']
        if msgs:
            fmtStr = 'Uni coefficient estimation: {0:15.13f} s: {1:5.1f} r2: {2:15.13f}'
            print(fmtStr.format(coeff[UNI], perr[UNI], r2[UNI]), file=sys.stderr)

        ### family coefficients
        ### also use one point per copy number
        ### test for not enough points and r2 <= 0.8

        fams = list(set([spike['family'] for spike in spikes]))
        if msgs:
            print('Fams: {0}'.format(fams))
        for fam in fams:
            copyNos = list(set([int(spike['copies']) for spike in spikes if spike['family'] == fam]))
            reads = [ sum([ spike['reads'] for spike in spikes
                            if spike['family'] == fam and int(spike['copies']) == copyNo])
                      for copyNo in copyNos ]
            if len(reads) <= 1 or max(reads) <= DIAGMAX:
                ## not enough points; use UNI coefficient
                coeff[fam] = coeff[UNI]
                r2[fam] = r2[UNI]
                perr[fam] = perr[UNI]
            else:
                ### fit curve
                if msgs >= 2:
                    fmtStr = '{0} regression: {1} {2}'
                    print(fmtStr.format(fam, copyNos, reads), file=sys.stderr)
                lr = linearRegression(copyNos, reads)
                coeff[fam] = lr['slope']
                r2[fam] = lr['r2']
                perr[fam] = lr['s']
                if lr['r2'] <= 0.8:
                    ## r2 <= 0.8; use UNI cofficient
                    coeff[fam] = coeff[UNI]
                    r2[fam] = r2[UNI]
                    perr[fam] = perr[UNI]
            if msgs:
                fmtStr = '{0} coefficient estimation: {1:15.13f} s: {2:5.1f} r2: {3:15.13f}'
                print(fmtStr.format(fam, coeff[fam], perr[fam], r2[fam]), file=sys.stderr)

    return coeff, r2

############################################################
### add normalized reads
###
### data: entire .vidjil JSON structure
### coeff: dict with normalization coefficients for each family
### r2: Pearson's r2 for each family
### spk: total number of spike-in reads

def addNormalizedReads(data, coeff, r2, spk):
    if msgs:
        print('Normalizing reads and prinitng output file', file=sys.stderr)

    data["mrd"] = {}
    data['mrd']['coefficients'] = coeff
    ## find prevalent germine and sum of its reads
    prevalent, spg = prevalentGermline(data['reads']['germline'])
    data['mrd']['prevalent']  = [ prevalent ]
    data['mrd']['ampl_coeff'] = [ spg/spk ]
    data['mrd']['UNI_COEFF']  = [ coeff[UNI] ]
    data['mrd']['UNI_R2']     = [ r2[UNI] ]
    ### normalize just clones from the prevalent germline
    for clone in data['clones']:
        ## grab read data
        a = clone['reads']
        if len(a) > 1:
            print('  *** reads array with many elements', file=sys.stderr)
        reads = a[0]
        if 'name' in clone:
            ## use UNI for unknown, unnamed or unsegmented families or reads
            vfam = vidfam(clone['name'])
            if vfam in family:
                fam = family[vfam]
                if clone['name'].find('DD3') >= 0:
                    fam += '-dd3'
            else:
                ## unknown family or unsegmented clone
                fam = UNI
            if fam not in coeff:
                print('  *** check JSON file: missing family: {0}'.format(fam), file=sys.stderr)
                print('  ***  (using universal coefficient)', file=sys.stderr)
                fam = UNI
        else:
            ## unnamed clone
            fam = UNI
        if 'germline' in clone and clone['germline'][0:3] == prevalent:
            clone['mrd'] = {}
            clone['mrd']['norm_coeff'] = [ coeff[fam] ]
            clone['mrd']['copy_number'] = [ reads * coeff[fam] ]
            clone['mrd']['R2'] = [ r2[fam] ]
            clone['mrd']['family'] = [ fam ]
            clone['normalized_reads'] = [ reads*coeff[fam]*spg/NG600 ]

############################################################
### command line, initial msg

if __name__ == '__main__':

    print("#", ' '.join(sys.argv))

    DESCRIPTION = 'Script to include spike-nomalization on a vidjil result file'
    
    #### Argument parser (argparse)

    parser = argparse.ArgumentParser(description= DESCRIPTION,
                                    epilog='''Example:
  python %(prog)s --input filein.vidjil --ouput fileout.vidjil''',
                                    formatter_class=argparse.RawTextHelpFormatter)


    group_options = parser.add_argument_group() # title='Options and parameters')
    group_options.add_argument('-i', '--input',  help='Vidjil input file')
    group_options.add_argument('-o', '--output', help='Vidjil output file with normalization')
    group_options.add_argument('--silent', action='store_false', default=False, help='run script in silent verbose mode')
    
    args = parser.parse_args()

    inf  = args.input
    outf = args.output
    msgs = args.silent
    print ( "silent: %s" % msgs)

    # read input file
    if msgs:
        print('Reading input file', file=sys.stderr)

    with open(inf) as inp:
        data = json.load(inp)

    # process data
    spikes = spikeTable(data)
    coeff, r2 = computeCoefficients(spikes)
    spk = sum([spike['reads'] for spike in spikes])
    if coeff:
        addNormalizedReads(data, coeff, r2, spk)

    # write output file
    with open(outf, 'w') as of:
        print(json.dumps(data, sort_keys=True, indent=2), file=of)
