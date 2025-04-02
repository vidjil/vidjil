import os
import sys
from subprocess import PIPE, STDOUT, Popen
from xmlrpc.server import SimpleXMLRPCServer

import settings


def fuse(cmd, output_dir, filename):
    print(f"Start fuse with command {cmd}")

    fuse_log_file = open(output_dir + "/" + filename + ".fuse.log", "w")
    output_file = output_dir + "/" + filename + ".fused"

    # Start fuse
    p = Popen(
        cmd, shell=True, stdin=PIPE, stdout=fuse_log_file, stderr=STDOUT, close_fds=True
    )
    p.communicate()
    sys.stdout.flush()

    fuse_filepath = os.path.abspath(output_file)
    print(f"fuse finished - fuse_filepath : {fuse_filepath} - log file {fuse_log_file}")
    return fuse_filepath


def main():
    server_address = (settings.FUSE_SERVER, settings.PORT_FUSE_SERVER)
    print(f"Starting fuse server, with address {server_address}")
    server = SimpleXMLRPCServer(server_address)
    server.register_function(fuse, "fuse")
    while True:
        server.handle_request()


if __name__ == "__main__":
    main()
