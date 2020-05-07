
ARCHIVE = 'http://www.vidjil.org/releases/'
DEST = 'bench/'
SRC = DEST + 'src/'
BIN = DEST + 'bin/'
RUN = DEST + 'run/'

OUT = 'benchmark.log'

CURRENT = 'HEAD'

#####

WARN_RATIO = 0.10

LIMIT1e5 = '-x 100000 '
LIMIT1e4 = '-x 10000 '
LIMIT1e3 = '-x 1000 '
LIMIT1e2 = '-x 100 '

MULTI = '-g ../../germline/homo-sapiens.g '
IGH = '-g ../../germline/homo-sapiens.g:IGH '
L4 = '../../demo/LIL-L4.fastq.gz '
S22 = '../../demo/Stanford_S22.fasta '

CONSENSUS_NO = '-y 0 -z 0 '
CONSENSUS_ALL = '-y all -z 0 '
DESIGNATIONS = '-c designations '

from collections import OrderedDict

BENCHS = OrderedDict([
  ('init', '-x 1 ' + MULTI + L4 + CONSENSUS_NO),
  ('germ', LIMIT1e5 + MULTI + L4 + '-c germlines '),

  ('multi-0', LIMIT1e5 + MULTI + L4 + CONSENSUS_NO),
  ('multi-1', LIMIT1e5 + MULTI + L4 + CONSENSUS_ALL),
  ('multi-a', LIMIT1e3 + MULTI + L4 + DESIGNATIONS + '-z 1000'),

  ('igh-0', LIMIT1e5 + IGH + S22 + CONSENSUS_NO),
  ('igh-1', LIMIT1e5 + IGH + S22 + CONSENSUS_ALL),
  ('igh-a', LIMIT1e3 + IGH + S22 + DESIGNATIONS),
])

COMPATIBILITY = [
  ('2019.03', '-c designations', '-c segment'),
]

# Simple colored output

CSIm = '\033[%sm'

class ANSI:
    RESET = 0
    BRIGHT = 1
    BLACK = 30
    RED = 31
    GREEN = 32
    YELLOW = 33
    BLUE = 34
    MAGENTA = 35
    CYAN = 36
    WHITE = 37

def color(col, text, colorize = True):
    if not colorize:
        return text
    return CSIm % col + text + CSIm % ANSI.RESET

#

def convert(cmd, release):
    '''
    Convert a command line to be used by old vidjil-algo releases

    >>> convert('-x 10 -c designations', '2019.05')
    '-x 10 -c designations'

    >>> convert('-x 10 -c designations', '2018.02')
    '-x 10 -c segment'
    '''

    for rel, new, old in COMPATIBILITY:
        if release < rel:
            cmd = cmd.replace(new, old)
    return cmd


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
import datetime
from tempfile import NamedTemporaryFile

stats = {}

parser = argparse.ArgumentParser()
parser.add_argument('-c', '--current', action='store_true', help='install current HEAD')
parser.add_argument('-i', '--install', dest='release', default=[], action='append', 
                    help='install selected releases from %s, such as in "-s 2018.02 -s 2020.05"' % ARCHIVE)
parser.add_argument('-I', '--install-all', action='store_true',
                    help='install all releases from %s' % ARCHIVE)
parser.add_argument('-b', '--benchmark', action='store_true', help='benchmark installed releases')
parser.add_argument('-s', '--select', dest='benchs', default=[], action='append',
                    help = 'Specify the benchmarks to select (among {}, default is all)'.format(', '.join(BENCHS.keys())))
parser.add_argument('-r', '--retries', type=int, default=1, help='Number of times each benchmark is launched')


def go(cmd, log=None, time=False):
    if log:
        flog = open(log, 'a')
        flog.write('\n\n%s\n' % cmd)
    else:
        flog = sys.stdout
    print(cmd, end=' ')
    if time:
        time_file = NamedTemporaryFile(mode='w+', delete=False)
        cmd = "/usr/bin/time -o {} -f '%U\t%S\t%M' {}".format(time_file.name, cmd)
    returncode = subprocess.call(cmd, shell=True, stderr=subprocess.STDOUT, stdout=flog)
    if log:
        flog.close()

    if returncode:
        print('FAILED', end=' ')
        raise subprocess.CalledProcessError(returncode, cmd)
    elif not time:
        return
    else:
        (utime, stime, mem) = [ float(i) for i in time_file.read().split() ]

    mem = mem // 1000
    os.unlink(time_file.name)
    print(color(ANSI.YELLOW, '%5.2fu %5.2fs %6.1fM' % (utime, stime, mem)))

    return (stime + utime, mem)

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

    if release == CURRENT:
        go('make -C ../../algo', log)
        go('cp ../../vidjil-algo %s/%s ' % (BIN, release), log)
        return

    go('wget %s/%s -O %s/src.tgz' % (ARCHIVE, tgz, dir), log)
    go('cd %s ; tar xfz src.tgz' % dir, log)
    go('cd %s/*%s* ; make vidjil-algo || make CXX=g++-6' % (dir, release), log)
    res = go('cp %s/*%s*/vidjil* %s/%s ' % (dir, release, BIN, release), log)

    print()

def install_current():
    install(CURRENT, None)

def install_from_archive(install_versions):
    for release, tgz in get_releases():
        try:
            if (not install_versions) or release in install_versions:
                install(release, tgz)
        except subprocess.CalledProcessError:
            print("FAILED")

def installed():
    return sorted([f.replace(BIN, '') for f in glob.glob('%s/*' % BIN)])


def run_all(tag, args, retries):
    print(color(ANSI.CYAN, '==== %s ==== %s' % (tag, args)))
    os.system('mkdir -p %s' % RUN)
    for release in installed():
        print(color(ANSI.MAGENTA, '%9s' % release), end=' ')
        log = RUN + '/%s-%s.log' % (tag, release)

        cmd = '%s/%s ' % (BIN, release) + convert(args, release)
        try:
            benchs = []
            for i in range(retries) :
                benchs.append(go(cmd, log, True))
            time = min([b[0] for b in benchs])
            mem = min([b[1] for b in benchs])
            stats[tag,release] = (time, mem)
        except subprocess.CalledProcessError:
            stats[tag,release] = None
    print()

def bench_line(f, release, stats, index, format='%8.2f', previous_release=None, colorize=True):
    f.write('%-9s' % release)
    warned = False
    for tag in BENCHS:
        if (tag,release) in stats:
            if stats[tag, release] is not None:
                val = stats[tag,release][index]
                b = format % val

                # Highlight value
                if previous_release:
                    if stats[tag, previous_release] is not None:
                        previous_val = stats[tag,previous_release][index]
                        if val/previous_val >= 1 + WARN_RATIO:
                            b = color(ANSI.RED, b) if colorize else '!' + b[1:]
                            warned = True
                        elif val/previous_val <= 1 - WARN_RATIO:
                            b = color(ANSI.GREEN, b) if colorize else '!' + b[1:]
                            warned = True
            else:
                b = '%8s' % 'x'
        else:
            b = '%8s' % '-'
        f.write(b)
    f.write('\n')
    return warned
    
def show_benchs(f, watched_release=None, colorize=True):
    f.write('\n')
    f.write(color(ANSI.YELLOW, '\nBenchmark summary, %s\n' % datetime.datetime.now().isoformat(), colorize))
    for tag, bench in BENCHS.items():
        f.write('%8s: %s\n' % (tag, bench))

    f.write('\n')
    f.write('%9s ' % '')
    for tag in BENCHS:
        f.write('%8s' % tag)

    warned = False

    for (key, index, format) in [
      ('Time (s)', 0, '%8.2f'),
      ('Memory (MB)', 1, '%8d'),
     ]:
        f.write(color(ANSI.YELLOW, '\n%s\n' % key, colorize))
        previous_release = None
        for release in installed():
            w = bench_line(f, release, stats, index, format, previous_release, colorize)
            previous_release = release
            if w and release == watched_release:
                warned = True

    return warned

def bench_all(retries, selected_benchs):
    try:
        go("make -C ../.. germline")
        go("make -C ../.. data")
        go("make -C ../.. demo")
        print()
        print()
        for tag, bench in BENCHS.items():
            if len(selected_benchs) == 0 or tag in selected_benchs:
                run_all(tag, bench, retries)
    except KeyboardInterrupt:
        pass



if __name__ == '__main__':
    args = parser.parse_args(sys.argv[1:])

    if not args.release and not args.benchmark:
        parser.print_help()

    if args.current:
        install_current()

    if args.release or args.install_all:
        install_from_archive(args.release)

    if args.benchmark:
        bench_all(args.retries, args.benchs)
        show_benchs(sys.stdout, colorize=True)
        print('\n==>', OUT)

        watched_release = installed()[-1]
        warned = show_benchs(open(OUT, 'w'), watched_release=watched_release, colorize=False)
        sys.exit(42 if warned else 0)
