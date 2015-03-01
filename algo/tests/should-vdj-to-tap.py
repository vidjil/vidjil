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

PROGRAM = os.getenv('PROGRAM')
if not PROGRAM:
    PROGRAM = '../../vidjil -c segment -i -g ../../germline'

SHOULD_SUFFIX = '.should-vdj.fa'
TAP_SUFFIX = '.tap'
LOG_SUFFIX = '.log'

global_failed = False

def fasta_id_lines_from_program(f_should):
    f_log = f_should + LOG_SUFFIX
    f_log = f_log.replace(SHOULD_SUFFIX, '')

    cmd = PROGRAM + ' ' + f_should + ' > ' + f_log
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
    result = l[pos+1:]

    # We could have something that allows some regexp (still allowing * and + without escaping)
    should_pattern = should.replace('_', ' ')

    tap = ''

    if not should_pattern in result:
        globals()['global_failed'] = True
        tap += 'not '

    tap += 'ok %d - %s' % (tap_id, should_pattern)

    if not should_pattern in result:
        tap += ' - found instead ' + result

    return tap


def should_to_tap_one_file(f_should):

    f_tap = f_should + TAP_SUFFIX
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

    for f_should in sys.argv[1:]:
        should_to_tap_one_file(f_should)
        print

    if global_failed:
        sys.exit(1)
