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

version = 'B0.01.02'

### spike-in structures

spike_ins = [
    ## Gui
    {'name': 'VH1_MMR', 'userFamily': 'VH1', 'copies': 10},
    {'name': 'VH1_GSF', 'userFamily': 'VH1', 'copies': 40},
    {'name': 'VH1_CAF', 'userFamily': 'VH1', 'copies': 160},
    {'name': 'VH2_RGG', 'userFamily': 'VH2', 'copies': 10},
    {'name': 'VH2_MSF', 'userFamily': 'VH2', 'copies': 40},
    {'name': 'VH2_GCP', 'userFamily': 'VH2', 'copies': 160},
    {'name': 'VH3_DSM', 'userFamily': 'VH3', 'copies': 10},
    {'name': 'VH3_MSF', 'userFamily': 'VH3', 'copies': 40},
    {'name': 'VH3_JCL', 'userFamily': 'VH3', 'copies': 160},
    {'name': 'VH4_BMS', 'userFamily': 'VH4', 'copies': 10},
    {'name': 'VH4_LAA', 'userFamily': 'VH4', 'copies': 40},
    {'name': 'VH4_JSN', 'userFamily': 'VH4', 'copies': 160},
    {'name': 'VH5_LMR', 'userFamily': 'VH5', 'copies': 10},
    {'name': 'VH5_ASV', 'userFamily': 'VH5', 'copies': 40},
    {'name': 'VH5_SSG', 'userFamily': 'VH5', 'copies': 160},
    {'name': 'VH6_GLR', 'userFamily': 'VH6', 'copies': 10},
    {'name': 'VH6_GSB', 'userFamily': 'VH6', 'copies': 40},
    {'name': 'VH6_EG' , 'userFamily': 'VH6', 'copies': 160},
    {'name': 'VH7_LCL', 'userFamily': 'VH7', 'copies': 10},
    {'name': 'VH7_WBL', 'userFamily': 'VH7', 'copies': 40},
    {'name': 'VH7_GF' , 'userFamily': 'VH7', 'copies': 160},
    ## Nat
    {'name': 'Vg1_RGS', 'userFamily': 'Vg1', 'copies': 10},
    {'name': 'Vg1_ESM', 'userFamily': 'Vg1', 'copies': 40},
    {'name': 'Vg1_MBS', 'userFamily': 'Vg1', 'copies': 160},
    {'name': 'Vg9_NNS', 'userFamily': 'Vg9', 'copies': 10},
    {'name': 'Vg9_CMN', 'userFamily': 'Vg9', 'copies': 40},
    {'name': 'Vg9_MDR_1', 'userFamily': 'Vg9', 'copies': 160},
    {'name': 'Vg10_JPS', 'userFamily': 'Vg10', 'copies': 10},
    {'name': 'Vg10_ANM', 'userFamily': 'Vg10', 'copies': 40},
    {'name': 'Vg10_PRC', 'userFamily': 'Vg10', 'copies': 160},
    {'name': 'Vg11_RRP', 'userFamily': 'Vg11', 'copies': 10},
    {'name': 'Vg11_GLR', 'userFamily': 'Vg11', 'copies': 40},
    {'name': 'Vg11_BMS', 'userFamily': 'Vg11', 'copies': 160},
]

userFamily = {
    ## Gui
    'IGHV1': 'VH1',
    'IGHV2': 'VH2',
    'IGHV3': 'VH3',
    'IGHV4': 'VH4',
    'IGHV5': 'VH5',
    'IGHV6': 'VH6',
    'IGHV7': 'VH7',
    'IGHV8': 'VH8',
    'IGHV9': 'VH9',
    ## Nat
    'TRGV1': 'Vg1',
    'TRGV2': 'Vg1',
    'TRGV3': 'Vg1',
    'TRGV5': 'Vg1',
    'TRGV9': 'Vg9',
    'TRGV10': 'Vg10',
    'TRGV11': 'Vg11',
    }

############################################################
### routines

### function for curve fitting y = ax
### just slope, no intercept, to force (0,0)
def linearRegression(y, x):
    lr = {}
    n = len(y)                 # should be same as len(x)
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

### function to get family name from name
def parseFamily(s):
    pos = 1
    while pos < len(s) and s[pos].isalnum():
        pos+=1
    return (s[:pos])

### function to find user family name from spike-in list
### returns user family or empty string if not found
def uFamily(label, spikeList=spike_ins):
    pos = 0
    while pos < len(spikeList) and spikeList[pos]['name'] != label:
        pos+=1
    return spikeList[pos]['userFamily'] if pos < len(spikeList) else ''

############################################################
### command line, initial msg

inf = sys.argv[1]
outf = sys.argv[2]
msgs = 1 if len(sys.argv) >= 4 else 0

############################################################
### read input file

if msgs >= 1:
    print('Reading follow-up file', file=sys.stderr)

with open(inf) as inp:
    data = json.load(inp)

total = 0
clone = {}
spike = {}
expectedFams = set()

for s in spike_ins:
    spike[s['name']] = 0
    fam = s['userFamily']
    expectedFams.add(fam)

clones = data['clones']
for c in clones:
    cloneID = c['id']
    ## grab read data
    a = c['reads']
    if len(a) > 1:
        print('  *** reads array with many elements', file=sys.stderr)
    clone[cloneID] = a[0]
    total += a[0]
    if 'label' in c:
        ## spike-in clone
        label = c['label']
        ufam = uFamily(label)
        if ufam == '':
            ## spike-ins not in the spike_ins struct: unexpected
            fmtStr = '  *** unexpected spike-in {0}'
            print(fmtStr.format(label), file=sys.stderr)
        else:
            if label in spike:
                spike[label] += a[0]
            else:
                spike[label] = a[0]


############################################################
### curve-fitting

### print table
if msgs >= 1:
    print('Spike-in Table', file=sys.stderr)
    for i in range(len(spike_ins)):
        label = spike_ins[i]['name']
        if label in spikeReads and spikeReads[label] >= 1:
            copies[label] = spike_ins[i]['copies']
            userFam[label] = uFamily(label)
            userFamPresent[userFam[label]] = True
            fmtStr = '{0:9} {1:6} {2:4} {3:5}'
            print(fmtStr.format(label, spikeReads[label], copies[label], userFam[label]), file=sys.stderr)

### skip computing f for each user family
### will do just universal coefficient

f = {}
r2 = {}
perr = {}

### universal coefficient
### uses one point per copy number
### x = copy number
### y = mean of reads for this copy number
x = []
y = []
### print('Spike-in Copy Number Table')
cps = set(copies.values())
for cp in cps:
    nrds = [spikeReads[label] for label in copies if copies[label] == cp]
    s = sum(nrds)
    c = len(nrds)
    x.append(1.0*s/c)
    y.append(1.0*cp)
    ## print('{0:5} {1:10.1f}'.format(s/c, cp))

### test for zero items
if len(x) == 0:
    print('** No spike-ins for universal coefficient **')
    print('** Please check input files **')
else:
    ### fit curve
    lr = linearRegression(y, x)
    f['universal'] = lr['slope']
    r2['universal'] = lr['r2']
    perr['universal'] = lr['s']
    if msgs >= 1:
        fmtStr = 'Universal coefficient estimation: {0} s: {1:.3%} r2: {2}'
        print(fmtStr.format(f['universal'], perr['universal'], r2['universal']), file=sys.stderr)

############################################################
### add normalized reads

if msgs >= 1:
    print('Normalizing reads and prinitng output file', file=sys.stderr)

id = {}

### Count number of reads for clones
### only clones with names and whose family has a multiplier 
### will be normalized (name in needed for family)
for c in clones:
    if 'name' in c:
        ## grab clone info
        cloneID = c['id']
        if msgs >= 1:
            print('  {0}'.format(cloneID), file=sys.stderr)
        if cloneID in id:
            print('  *** repeated clone ID: {0}'.format(cloneID), file=sys.stderr)
        else:
            id[cloneID] = 1
        fam = 'universal'
        ## grab read data
        a = c['reads']
        if len(a) > 1:
            print('  *** reads array with many elements', file=sys.stderr)
        ## update counters for clones
        reads = a[0]
        c['normalized_reads'] = [ reads*f[fam]/100000 ]

############################################################
### write output file

with open(outf, 'w') as of:
    print(json.dumps(data, sort_keys=True, indent=2), file=of)
