'''
Launches a command, copyies its output both to standard output and in zero or more files,
and finally exits with the same exit code of the command.
'''

from __future__ import print_function

import sys
import subprocess
import shlex

import argparse

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('-v', '--verbose', action='store_true', default=False)

parser.add_argument('cmd', help='''command to run''')
parser.add_argument('file', nargs='*', help='''output file(s)''')



def unbuffered_read(f):
    # see http://stackoverflow.com/a/1183654
    l = f.readline().decode("utf-8")
    while l:
        yield l
        l = f.readline().decode("utf-8")

def tee(cmd, outputs):
    '''Runs 'cmd', pipe the output to 'outputs', and returns the exit code of 'cmd' '''
    argz = shlex.split(cmd)
    p = subprocess.Popen(argz,
                         stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                         bufsize=0,
                         close_fds=True)

    for l in unbuffered_read(p.stdout):
        for o in outputs:
            o.write(l)

    p.wait()
    return p.returncode



if __name__ == '__main__':

    args = parser.parse_args()
    outputs = [sys.stdout]

    print()

    for f in args.file:
        print('==> %s' % f)
        outputs += [open(f, 'w')]

    if args.verbose:
        print('### %s' % args.cmd)
        
    ex = tee(args.cmd, outputs)

    if args.verbose:
        print('##> %s' % ex)

    sys.exit(ex)


    
