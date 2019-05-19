
ARCHIVE = 'http://www.vidjil.org/releases/'
DEST = 'bench/'
SRC = DEST + 'src/'
BIN = DEST + 'bin/'


#####

import re
import urllib.request
import os
import subprocess
import glob
import time
import sys
import argparse
import resource

stats = {}

parser = argparse.ArgumentParser()
parser.add_argument('-i', '--install', action='store_true', help='install various releases')


def go(cmd, log=None):
    if log:
        flog = open(log, 'a')
        flog.write('\n\n%s\n' % cmd)
    else:
        flog = sys.stdout
    print(cmd, end=' ')
    completed = subprocess.run(cmd, shell=True, stderr=subprocess.STDOUT, stdout=flog)
    if log:
        flog.close()

    if completed.returncode:
        print('FAILED', end=' ')

    completed.check_returncode()

def code(tgz):
    '''
    Extract release tag from filename

    >>> code('vidjil-algo-2001.01.tar.gz')
    '2001.01'
    '''
    base = tgz.replace('.tgz', '').replace('.tar.gz', '').replace('vidjil-algo-', '').replace('vidjil-', '')
    return base

def get_releases():
    with urllib.request.urlopen(ARCHIVE) as response:
        for elt in str(response.read()).split('"'):
            ok = True
            for ignore in ['<', '>', 'x86', 'latest']:
                if ignore in elt:
                    ok = False
                    break
            if ok and 'vidjil-' in elt:
                yield code(elt), elt

def install(release, tgz):
    os.system('mkdir -p %s' % BIN)
    print('== %s' % release)

    dir = SRC + release
    go('mkdir -p %s' % dir)

    log = dir + '/' + 'install.log'
    go('wget %s/%s -O %s/src.tgz' % (ARCHIVE, tgz, dir), log)
    go('cd %s ; tar xfz src.tgz' % dir, log)
    go('cd %s/*%s* ; make vidjil-algo || make CXX=g++-6' % (dir, release), log)
    res = go('cp %s/*%s*/vidjil* %s/%s ' % (dir, release, BIN, release), log)

    print()

def install_all():
    for release, tgz in get_releases():
        try:
            install(release, tgz)
        except subprocess.CalledProcessError:
            print("FAILED")

def installed():
    return sorted([f.replace(BIN, '') for f in glob.glob('%s/*' % BIN)])



if __name__ == '__main__':
    args = parser.parse_args(sys.argv[1:])

    if args.install:
        install_all()