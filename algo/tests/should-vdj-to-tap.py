'''
Tests one ore several .should-vdj.fa files.
A .should-vdj.fa file is a fasta file whose identifiers are in the form:

>should_pattern comments

The 'should_pattern' describes the expected V(D)J segmentation in a .vdj format.
All spaces is the pattern have to be replaced by '_'.
The script launches Vidjil (or any other PROGRAM) on the .shoud-vdj.fasta file,
expecting that it returns another fasta file whose identifiers are in the form:

>should_pattern result

The 'should_pattern' is then checked against the 'result' part, and a .tap file is produced.
'''

import sys
from subprocess import Popen, PIPE, STDOUT

import os
import argparse

VIDJIL_FINE = '{directory}/vidjil -c segment -i -g {directory}/germline %s > %s'
VIDJIL_KMER = '{directory}/vidjil -b out -c windows -uU -i -g {directory}/germline %s > /dev/null ; cat out/out.segmented.vdj.fa out/out.unsegmented.vdj.fa > %s'

parser = argparse.ArgumentParser(formatter_class=argparse.RawTextHelpFormatter)
parser.add_argument('--program', '-p', default=VIDJIL_FINE, help='program to launch on each file (%(default)s)')
parser.add_argument('-q', dest='program', action='store_const', const=VIDJIL_KMER, help='shortcut for -p (VIDJIL_KMER), to be used with -2')
parser.add_argument('--after-two', '-2', action='store_true', help='compare only the right part of the pattern after two underscores (locus code)')
parser.add_argument('--directory', '-d', default='../..', help='base directory where Vidjil is. This value is used by the default -p and -q values (%(default)s)')
parser.add_argument('file', nargs='+', help='''.should-vdj.fa files''')

args = parser.parse_args()

SHOULD_SUFFIX = '.should-vdj.fa'

TAP_SUFFIX = '.tap'
LOG_SUFFIX = '.log'

PROG_TAG = '.1'

if args.after_two:
    PROG_TAG = '.2'


global_failed = False

def fasta_id_lines_from_program(f_should):
    f_log = f_should + PROG_TAG + LOG_SUFFIX
    f_log = f_log.replace(SHOULD_SUFFIX, '')

    program = args.program.replace('{directory}',args.directory)
    cmd = program % (f_should, f_log)
    print cmd
    os.system(cmd)

    for l in open(f_log):
        if not l:
            continue
        if l[0] == '>':
            yield l

def id_line_to_tap(l, tap_id):
    '''
    Parses lines such as:
    >TRDD2*01_1/AGG/1_TRDD3*01__TRD+ + VJ 	0 84 88 187	TRDD2*01 1/AGG/1 TRDD3*01  TRD+
    and return a .tap line
    '''

    l = l.strip()
    pos = l.find(' ')
    should = l[1:pos]
    result = l[pos+1:] + ' '

    # We could have something that allows some regexp (still allowing * and + without escaping)
    should_pattern = should.replace('_', ' ')

    if args.after_two:
        # Testing only the locus code
        if '  ' in should_pattern:
            should_pattern = should_pattern.split('  ')[1]
        else:
            return ''

    tap = ''

    if not should_pattern in result:
        globals()['global_failed'] = True
        tap += 'not '

    tap += 'ok %d - %s' % (tap_id, should_pattern)

    if not should_pattern in result:
        tap += ' - found instead ' + result

    return tap


def should_to_tap_one_file(f_should):

    f_tap = f_should + PROG_TAG + TAP_SUFFIX
    f_tap = f_tap.replace(SHOULD_SUFFIX, '')

    print "<== %s" % f_should
    id_lines = list(fasta_id_lines_from_program(f_should))

    if not(id_lines):
        print "Error. There is no '>' line in this file."
        sys.exit(2)

    print "==> %s" % f_tap

    with open(f_tap, 'w') as ff:
        ff.write("1..%d\n" % len(id_lines))

        for tap_id, l in enumerate(id_lines):
            tap_line = id_line_to_tap(l, tap_id+1)
            if 'not ok' in tap_line:
                print tap_line
            ff.write(tap_line + '\n')



if __name__ == '__main__':

    for f_should in args.file:
        should_to_tap_one_file(f_should)
        print

    if global_failed:
        sys.exit(1)
