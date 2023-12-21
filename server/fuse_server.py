from SimpleXMLRPCServer import SimpleXMLRPCServer
from subprocess import *

import sys
sys.path.insert(0, './py4web/apps/vidjil')
import defs
import os.path

def fuse(cmd, output_dir, filename):
    from subprocess import Popen, PIPE, STDOUT, os

    fuse_log_file = open(output_dir+'/'+filename+'.fuse.log', 'w')
    output_file = output_dir+'/'+filename+'.fused'

    ## fuse.py 
    p = Popen(cmd, shell=True, stdin=PIPE, stdout=fuse_log_file, stderr=STDOUT, close_fds=True)
    (stdoutdata, stderrdata) = p.communicate()
    fuse_filepath = os.path.abspath(output_file)
    p.wait()
    return fuse_filepath

def main():
    server = SimpleXMLRPCServer((defs.FUSE_SERVER, defs.PORT_FUSE_SERVER))
    server.register_function(fuse, "fuse")
    while True:
        server.handle_request()

if __name__ == "__main__":
    main()

