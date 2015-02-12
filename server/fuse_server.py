from SimpleXMLRPCServer import SimpleXMLRPCServer, SimpleXMLRPCRequestHandler
from subprocess import *

import sys
sys.path.insert(0, './web2py/applications/vidjil/modules')
import defs

def fuse(cmd, output_dir, filename):
    import time, datetime, sys, os.path, random
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
    server = SimpleXMLRPCServer(("localhost", defs.PORT_FUSE_SERVER))
    server.register_function(fuse, "fuse")
    while True:
        server.handle_request()

if __name__ == "__main__":
    main()

