#!/usr/bin/python3
# -*- coding: utf-8 -*-


############################################################
### imports

from __future__ import print_function, division
import sys
import json
import os
import tempfile
from  os import path
import inspect
import math
import argparse
import time
from collections import defaultdict 
############################################################
sys.path.insert(1, os.path.join(sys.path[0], '..'))
############################################################
### constants
PREPROCESS = "scriptFail"
version    = 'v0.01'




def analyse(data, directory):
    print( "Analysis Fail")
    raise Exception( "This script return an exception to test faild in preprocess pipeline")
    return



if __name__ == '__main__':

    print("#", ' '.join(sys.argv))

    DESCRIPTION  = "Script use for dev; Replace original_names[0] value by 'A'"
    
    
    #### Argument parser (argparse)

    parser = argparse.ArgumentParser(description= DESCRIPTION,
                                    epilog='''Example:
  python %(prog)s --input filein.vidjil --ouput fileout.vidjil''',
                                    formatter_class=argparse.RawTextHelpFormatter)


    group_options = parser.add_argument_group() # title='Options and parameters')
    group_options.add_argument('-i', '--input',  help='Vidjil input file')
    group_options.add_argument('-o', '--output', help='Vidjil output file with longer reads for RNAseq')
    group_options.add_argument('-d', '--directory', default="/tmp/", help='Vidjil output directory')
    group_options.add_argument('--silent', action='store_false', default=True, help='run script in silent verbose mode')
    group_options.add_argument('--clean', action='store_false', default=True, help='Clean directory of temporary file after running')
    
    args = parser.parse_args()

    inf  = args.input
    outf = args.output
    msgs = args.silent
    directory = args.directory
    print ( "silent: %s" % msgs)

    ## read input file
    #! input can be a concateantion as "pathpreprocess,pathfile" (see issue #4904)
    if "," in inf:
        inf = inf.split(",")[0]
    if msgs:
        print('Reading input file: %s' % inf)

    with open(inf) as inp:
        data = json.load(inp)

    start = time.time()

    # process data
    data = analyse(data, directory)

    # write output file
    # print( outf )
    with open(outf, 'w') as of:
        print(json.dumps(data, sort_keys=True, indent=2), file=of)
    print("time taken: %s" % (time.time() - start) )

