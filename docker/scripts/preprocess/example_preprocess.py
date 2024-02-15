"""
This file is a demonstration of a fictive preprocess that concatenate files R1 and R2 into the same file to be used by vidjil server configuration
You can use as documentation to understand way to make your own preprocess script.

Note that this script will be mounted into a docker volume at "usr/share/vidjil/tools/script/preprocess"
Note that you should delete temporary files yourself at the end of process to preserve disk space
"""

### Default python modules to load
from os import listdir, path, makedirs
from os.path import isfile, join
import sys
import subprocess
import argparse
import os
import tempfile
import json
from datetime import datetime

# ===========================================
### Import script from tools parent directory
# At least logparser script bis needed from vidjil/tools directory
# We neeed to make a relative import
# ===========================================
# Add parent path to sys
current = os.path.dirname(os.path.realpath(__file__))
parent = os.path.dirname(os.path.dirname(current))
sys.path.append(parent)
# ==========================
from logparser import *
from logparser import FlashLogParser
# ==========================


## Argument parser of your script
# warning: binary_dir, file_R1, file_R2 and output_file are mandatory as used by task process launcher
# You can add you own argument. 
# Value should be use in fuse command declaration: (ex:  -t 100 -d lenSeqAverage --overlaps --pre "example_preprocess.py --your-argument arg_value" )
parser = argparse.ArgumentParser(description='Fake preprocess to test pipeline')
parser.add_argument("binary_dir", help="path to executable")
parser.add_argument("file_R1", help="forward read file")
parser.add_argument("file_R2", help="reverse read file")
parser.add_argument("output_file", help="output file")
# extract arguments values
args  = parser.parse_args()
f_r1  = args.file_R1
f_r2  = args.file_R2
f_out = args.output_file

paths =  os.path.split(f_out)
path_head = paths[0]
path_file = paths[1]
# print variables content (for debuging)
print( "args: %s" % args)
print( "###" )
print( "f_r1: %s" % f_r1)
print( "f_r2: %s" % f_r2)
print( "f_out: %s" % f_out)
print( "path_head: %s" % path_head)
print( "path_file: %s" % path_file)


### Call after your commands, here a simple concat process
# Multiple commands can be chained as long 
# build command, splited
cmd = ['cat', f_r1, f_r2, " > ", f_out]
print( f"# Command to cat both file: {cmd}" )

# subprocess will execute your command
p = subprocess.Popen(cmd, stdout=subprocess.PIPE)

(stdoutdata, stderrdata) = p.communicate()

if p.returncode > 0:
    raise EnvironmentError("Cat of files failed")


## Finish preprocess by exporting logs into a specific json file that will be used to show information in vidjil client (panel info of sample)
try :

    with tempfile.NamedTemporaryFile(mode="w+") as logfile:
        logfile.write(stdoutdata)
        logfile.seek(0)

        output_file = '%s/pre_process.vidjil' % path_head
        # Will read log output of process and extract (by default) all "key: value" to store them in a dedicated logfile
        # See logparser.py for more detail. 
        log_parser  = LogParser(logfile)
        log_parser.export(sys.argv, output_file)

    print(stdoutdata) 
except IOError :
    os.remove(f_out)
    raise
