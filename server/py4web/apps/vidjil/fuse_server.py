import os
from xmlrpc.server import SimpleXMLRPCServer
from subprocess import *
import defs

def fuse(cmd, output_dir, filename):
    print(f"Start fuse with command {cmd}")

    fuse_log_file = open(output_dir+'/'+filename+'.fuse.log', 'w')
    output_file = output_dir+'/'+filename+'.fused'

    ## fuse.py 
    p = Popen(cmd, shell=True, stdin=PIPE, stdout=fuse_log_file, stderr=STDOUT, close_fds=True)
    (stdoutdata, stderrdata) = p.communicate()
    fuse_filepath = os.path.abspath(output_file)
    p.wait()
    
    print(f"fuse finished - fuse_filepath : {fuse_filepath} - stdoutdata : {stdoutdata} - stderrdata {stderrdata}")
    return fuse_filepath

def main():
    server_address = (defs.FUSE_SERVER, defs.PORT_FUSE_SERVER)
    print(f"Starting fuse server, with address {server_address}")
    server = SimpleXMLRPCServer(server_address)
    server.register_function(fuse, "fuse")
    while True:
        server.handle_request()

if __name__ == "__main__":
    main()

