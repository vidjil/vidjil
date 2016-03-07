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
import re
import ansi

PY_REQUIRED = (2, 7)
if sys.version_info < PY_REQUIRED:
    print("This script requires Python >= %d.%d." % (PY_REQUIRED))
    sys.exit(1)

from subprocess import Popen, PIPE, STDOUT
from collections import defaultdict

import os
import argparse

VIDJIL_FINE = '{directory}/vidjil -X 100 -# "#" -c segment -i -3 -d -g {directory}/germline %s >> %s'
VIDJIL_KMER = '{directory}/vidjil -# "#" -b out -c windows -uU -2 -i -g {directory}/germline %s > /dev/null ; cat out/out.segmented.vdj.fa out/out.unsegmented.vdj.fa >> %s'

parser = argparse.ArgumentParser(formatter_class=argparse.RawTextHelpFormatter)
parser.add_argument('--program', '-p', default=VIDJIL_FINE, help='program to launch on each file (%(default)s)')
parser.add_argument('-q', dest='program', action='store_const', const=VIDJIL_KMER, help='shortcut for -p (VIDJIL_KMER), to be used with -2')
parser.add_argument('--ignore_N', '-N', action='store_true', help='ignore N patterns, checking only gene and allele names')
parser.add_argument('--ignore_allele', '-A', action='store_true', help='ignore allele, checking only gene names')
parser.add_argument('--ignore_D', '-D', action='store_true', help='ignore D gene names and alleles')
parser.add_argument('--after-two', '-2', action='store_true', help='compare only the right part of the pattern after two underscores (locus code)')
parser.add_argument('--revcomp', '-r', action='store_true', help='duplicate the tests on reverse-complemented files')
parser.add_argument('--directory', '-d', default='../..', help='base directory where Vidjil is. This value is used by the default -p and -q values (%(default)s)')
parser.add_argument('--verbose', '-v', action='store_true')

parser.add_argument('file', nargs='+', help='''.should-vdj.fa files''')

args = parser.parse_args()

SHOULD_SUFFIX = '.should-vdj.fa'

TAP_SUFFIX = '.tap'
LOG_SUFFIX = '.log'

PROG_TAG = '.1'

if args.after_two:
    PROG_TAG = '.2'


global_failed = False
global_stats = defaultdict(int)
global_stats_failed = defaultdict(int)
global_stats_todo = defaultdict(int)

def fasta_id_lines_from_program(f_should):
    f_log = f_should + PROG_TAG + LOG_SUFFIX
    f_log = f_log.replace(SHOULD_SUFFIX, '')

    program = args.program.replace('{directory}',args.directory)
    cmd = program % (f_should, f_log)

    with open(f_log, 'w') as f:
        f.write('# %s\n\n' % cmd)

    exit_code = os.system(cmd)
    if exit_code:
        print "Error. The program halted with exit code %s." % exit_code
        sys.exit(3)

    for l in open(f_log):
        if not l:
            continue
        if l[0] == '>':
            yield l

def should_pattern_to_regex(p):
    '''
    Converts patterns such as the following ones into a Python regex.

    TRBV6-1 7/0/12 TRBD2 1/8/2 TRBJ2-7
    TRDV2*02 14/TCCCGGCCT/0 TRDD3*01_3/CCACGGC/4_TRAJ29*01
    TRDD2 18//4 TRAJ29 TRA+D # comments comments ...
    TRGV11 2/5/0 TRGJ1
    IGHV3-48 0/AA/6 IGHD5-12 (2//7, 3//6, 4//5) IGHJ4*02
    '''


    def process_term(term):

        # Comment, stop parsing here
        if term.startswith('#'):
            return []

        # Ambiguous/alternate pattern
        if term.startswith('('):
            choices = []
            term_without_par = term[1:-1]
            for t in term_without_par.split(','):
                choices += process_term(t)
            return ['(%s)' % '|'.join(choices)]

        # (such as CDR3 / junction)
        if term.startswith('{'):
            term = term.replace('*','[*]').replace('!','#')
            term = term.replace('{', '.*[{].*').replace('}', '.*[}]')
            return [term]

        # deletion/insertion/deletion
        # Note that '/' may be also in gene name, such as in IGKV1/OR-3*01
        if term.count('/') == 2:
            trim_left, n_region, trim_right = term.split('/')
            try:
                n_insert = int(n_region)
                n_region = '[ACGT]{%d}' % n_insert
            except ValueError: # already /ACGTG/
                pass

            if args.ignore_N:
                trim_left = '\d+'
                n_region = '[ACGT]*'
                trim_right = '\d+'

            return ['/'.join((trim_left, n_region, trim_right))]

        # Gene name, possibly without allele information
        if not '*' in term:
            # Some 'genes', such as KDE, do not have allele information
            term += '([*]\d*)?'
        else:
            gene, allele = term.split('*')

            if args.ignore_D and ('IGHD' in gene or 'TRBD' in gene or 'TRDD' in gene):
                gene = '\S*'
                allele = '\d*'

            if args.ignore_allele:
                allele = '\d*'

            term = gene + '[*]' + allele

        return [term]


    r = []
    p = p.replace(', ', ',')

    for term in p.split():
        r += process_term(term)
        
    regex_pattern = ' '.join(r)

    try:
        regex = re.compile(regex_pattern)
    except:
        sys.stderr.write("Error. Invalid regex_pattern: " + regex_pattern)
        sys.exit(4)

    if args.verbose:
        print
        print '      ', p, '->', regex_pattern

    return regex


r_locus = re.compile('\[\S+\]')

def id_line_to_tap(l, tap_id):
    '''
    Parses lines such as:
    >TRDD2*01_1/AGG/1_TRDD3*01__TRD+ + VJ 	0 84 88 187	TRDD2*01 1/AGG/1 TRDD3*01  TRD+
    or
    >TRDV3*01_0//0_TRDJ4*01 ! + VJ	0 49 50 97       TRD UNSEG noisy
    and return a .tap line
    '''

    l = l.strip()
    pos = l.find('\t')
    should = l[1:pos].replace(' + VJ','').replace(' + VDJ','').replace(' - VJ','').replace(' - VDJ','')
    result = l[pos+1:] + ' '

    should_pattern = should.replace('_', ' ')
    m_locus = r_locus.search(should_pattern)

    if m_locus:
        locus = m_locus.group(0)
        should_pattern = should_pattern.replace(locus, '')
        locus = locus.replace('[','').replace(']','')
    elif '  ' in should_pattern: # deprecated 'two spaces', will be removed
        locus = should_pattern.split('  ')[1].strip().split(' ')[0]
        should_pattern = should_pattern.split('  ')[0]
    else:
        locus = None

    if args.after_two:
        # Testing only the locus code
        if not locus:
            return '# %d - not tested (no locus)' % tap_id

        found = (locus in result) and not ('%s UNSEG' % locus in result)

    else:
        # Testing the should pattern
        should_regex = should_pattern_to_regex(should_pattern)
        match = should_regex.search(result)
        found = (match is not None)

    globals()['global_stats'][locus] += 1

    tap = ''

    if not found:
        globals()['global_stats_failed'][locus] += 1
        if 'TODO' in should:
            globals()['global_stats_todo'][locus] += 1
        else:
            globals()['global_failed'] = True

        tap += 'not '

    tap += 'ok %d ' % tap_id

    if 'BUG' in should:
        tap += '# BUG '

    if 'TODO' in should:
        tap += '# TODO '
    else:
        if not found:
            tap += ansi.Style.BRIGHT + ansi.Fore.RED + '# not ok ' + ansi.Style.RESET_ALL

    tap += '- ' + should_pattern

    if not found:
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
            if args.verbose or 'not ok' in tap_line:
                print tap_line
            ff.write(tap_line + '\n')



if __name__ == '__main__':

    for f_should in args.file:
        should_to_tap_one_file(f_should)

        if args.revcomp:
            f_should_rc = f_should + '.rc'
            os.system('python ../../germline/revcomp-fasta.py < %s > %s' % (f_should, f_should_rc))
            should_to_tap_one_file(f_should_rc)
        print

    print "=== Summary, should-vdj tests ===" + (' (only locus)' if args.after_two else '')
    print "            tested     passed     failed (todo)"
    for locus in sorted(global_stats):
        print "    %-5s     %4d       %4d       %4d   %4s" % (locus, global_stats[locus], global_stats[locus] - global_stats_failed[locus], global_stats_failed[locus],
                                                              ("(%d)" % global_stats_todo[locus] if global_stats_todo[locus] else ''))
    print "    =====     %4d       %4d       %4d   %4s" % (sum(global_stats.values()), sum(global_stats.values()) - sum(global_stats_failed.values()), sum(global_stats_failed.values()),
                                                           "(%d)" % sum(global_stats_todo.values()))
    print

    if global_failed:
        sys.exit(1)
