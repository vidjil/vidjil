'''
Tests one ore several .should-vdj.fa files.
A .should-vdj.fa file is a fasta file whose identifiers are in the form:

>should_pattern comments

The 'should_pattern' describes the expected V(D)J segmentation in a .vdj format.
All spaces is the pattern have to be replaced by '_'.
The script launches vidjil-algo (or any other PROGRAM) on the .shoud-vdj.fasta file,
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
import repseq_vdj

parser = argparse.ArgumentParser(formatter_class=argparse.RawTextHelpFormatter)
parser.add_argument('--program', '-p', default=repseq_vdj.VIDJIL_FINE, help='program to launch on each file (%(default)s)')
parser.add_argument('-q', dest='program', action='store_const', const=repseq_vdj.VIDJIL_KMER, help='shortcut for -p (VIDJIL_KMER), to be used with -2')
parser.add_argument('--ignore_N', '-N', action='store_true', help='ignore N patterns, checking only gene and allele names')
parser.add_argument('--ignore_del', '-s', action='store_true', help='ignore number of deletions at breakpoints')
parser.add_argument('--ignore_allele', '-A', action='store_true', help='ignore allele, checking only gene names')
parser.add_argument('--ignore_D', '-D', action='store_true', help='ignore D gene names and alleles')
parser.add_argument('--ignore_incomplete', '-+', action='store_true', help='ignore incomplete/unusual germlines')
parser.add_argument('--ignore_cdr3', '-3', action='store_true', help='ignore CDR3')
parser.add_argument('--after-two', '-2', action='store_true', help='compare only the right part of the pattern after two underscores (locus code)')
parser.add_argument('--revcomp', '-r', action='store_true', help='duplicate the tests on reverse-complemented files')
parser.add_argument('--directory', '-d', default='../..', help='base directory where Vidjil is. This value is used by the default -p and -q values (%(default)s)')

parser.add_argument('--verbose', '-v', action='store_true')

parser.add_argument('file', nargs='+', help='''.should-vdj.fa or .vdj files''')

args = parser.parse_args()

SHOULD_SUFFIX = '.should-vdj.fa'

TAP_SUFFIX = '.tap'
LOG_SUFFIX = '.log'

PROG_TAG = '.1'

if args.after_two:
    PROG_TAG = '.2'

SPECIAL_KEYWORDS = ['TODO']

def special_keywords(after_two):
    return SPECIAL_KEYWORDS + ['BUG' + ('-LOCUS' if after_two else '')]

global_failed = 0
global_stats = defaultdict(int)
global_stats_bug = defaultdict(int)
global_stats_failed = defaultdict(int)
global_stats_todo = defaultdict(int)

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

        if term in special_keywords(args.after_two):
            return []

        # Ambiguous/alternate pattern
        if term.startswith(','):
            choices = []
            term_without_comma = term[1:]
            return ['|' + ''.join(process_term(term_without_comma))]

        # (such as CDR3 / junction)
        if term.startswith('{'):
            term = term.replace('*','[*]').replace('!','#')
            term = term.replace('{', '.*[{].*').replace('}', '.*[}]')
            if args.ignore_cdr3:
                term = '('+term+')?'
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

            if args.ignore_N or args.ignore_del:
                trim_left = '[[:digit:]]*'
                trim_right = '[[:digit:]]*'
            if args.ignore_N:
                n_region = '[ACGT]*'

            separator = '/'
            if args.ignore_N:
                separator='/?'
            return [separator.join((trim_left, n_region, trim_right))]

        # Gene name, possibly without allele information
        if not '*' in term:
            # Some 'genes', such as KDE, do not have allele information
            term += '([*][[:digit:]]*)?'
        else:
            gene, allele = term.split('*')

            if '/' in gene:
                gene = gene.replace('/', '/?')

            if args.ignore_D and ('IGHD' in gene or 'TRBD' in gene or 'TRDD' in gene):
                gene = '[^[:space]]*'
                allele = '[[:digit:]]*'

            if args.ignore_allele:
                allele = '[[:digit:]]*'

            allele_separator = '[*]'
            if args.ignore_D or args.ignore_allele:
                allele_separator += '?'
            term = gene + allele_separator + allele

        return [term]


    r = []
    p = re.sub('\s*,\s*', ' ,', p)

    m = re.search('^(.*)\s*\((.+)\)\s*(.*)$', p)
    if m:
        # We have parentheses
        re1 = should_pattern_to_regex(m.group(1)).pattern
        re2 = '('+should_pattern_to_regex(m.group(2)).pattern+')'
        re3 = should_pattern_to_regex(m.group(3)).pattern
        regex_pattern = '[[:space:]]*'.join(x for x in [re1, re2, re3])
    else:
        # We have a parenthesis free expression
        for term in p.split():
            r += process_term(term)

        regex_pattern = '.*'.join(r)

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

def should_result_to_tap(should_pattern, result, tap_id):
    '''
    Parses (should, result) couples such as:
    'TRDD2*01 1/AGG/1 TRDD3*01  TRD+', 'TRDD2*01 1/AGG/1 TRDD3*01  TRD+'
    or
    'TRDV3*01 0//0 TRDJ4*01, 'TRD UNSEG noisy'
    and return a .tap line
    '''

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

    if locus is not None and '+' in locus and args.ignore_incomplete:
        return None

    if args.after_two:
        # Testing only the locus code
        if not locus:
            return '# %d - not tested (no locus)' % tap_id

        found = (locus in result) and not ('%s UNSEG' % locus in result)

    else:
        # Testing the should pattern
        should_regex = should_pattern_to_regex(should_pattern)
        # match = should_regex.search(result)
        match = os.system("echo '%s' | grep -E '%s' > /dev/null 2>&1" \
                          % (result.replace("'", "'\\''"),
                             should_regex.pattern.replace("'", "'\\''")))
        found = (match == 0) and not ('UNSEG' in result)

    globals()['global_stats'][locus] += 1

    ### Main output, .tap compliant, and main count

    tap = ''

    if not found:
        globals()['global_stats_failed'][locus] += 1
        if 'TODO' in should_pattern:
            globals()['global_stats_todo'][locus] += 1
        else:
            globals()['global_failed'] += 1
    if (args.after_two and 'BUG-LOCUS' in should_pattern)\
       or (not args.after_two and 'BUG' in should_pattern):
        globals()['global_stats_bug'][locus] += 1

        tap += 'not '

    tap += 'ok %d ' % tap_id

    ### Additional output/warnings

    special = False
    warn = False

    for kw in special_keywords(args.after_two):
        if kw in should_pattern:
            tap += '# %s ' % kw
            special = True

    warn = not found ^ special

    if warn:
        tap += ansi.Style.BRIGHT \
               + [ansi.Fore.RED, ansi.Fore.GREEN][found] \
               + '#! %s ' % ['not ok', 'ok'][found] \
               + ansi.Style.RESET_ALL

    ### Pattern

    tap += '- ' + should_pattern

    if not found:
        tap += ' - found instead ' + result

    return tap


def should_to_tap_one_file(f_should):

    f_tap = f_should + PROG_TAG + TAP_SUFFIX
    f_tap = f_tap.replace(SHOULD_SUFFIX, '')

    f_log = f_should + PROG_TAG + LOG_SUFFIX
    f_log = f_log.replace(SHOULD_SUFFIX, '')

    f_vdj = f_should + PROG_TAG + '.vdj'
    f_vdj = f_vdj.replace(SHOULD_SUFFIX, '')

    print "<== %s" % f_should

    vdj = repseq_vdj.VDJ_File()
    vdj.parse_from_gen(repseq_vdj.should_results_from_vidjil(args.program.replace('{directory}',args.directory), f_should, f_log))

    print "==> %s" % f_vdj
    vdj.write(open(f_vdj, 'w'))

    write_should_results_to_tap(vdj, f_tap)


def write_should_results_to_tap(should_results, f_tap):
    print "==> %s" % f_tap

    if not(should_results):
        print "Error. There is no results in this file."
        sys.exit(2)

    with open(f_tap, 'w') as ff:
        ff.write("1..%d\n" % len(should_results))

        for tap_id, (should, result) in enumerate(should_results):
            tap_line = should_result_to_tap(should, result, tap_id+1)
            if tap_line is not None:
                if args.verbose or '#!' in tap_line:
                    print tap_line
                ff.write(tap_line + '\n')



if __name__ == '__main__':

    for f_should in args.file:

        if '.vdj' in f_should:
            f_vdj = f_should
            f_tap = f_vdj + TAP_SUFFIX

            vdj = repseq_vdj.VDJ_File()
            vdj.parse_from_file(open(f_vdj))
            write_should_results_to_tap(vdj, f_tap)
            continue

        should_to_tap_one_file(f_should)

        if args.revcomp:
            f_should_rc = f_should + '.rc'
            os.system('python ../../germline/revcomp-fasta.py < %s > %s' % (f_should, f_should_rc))
            should_to_tap_one_file(f_should_rc)
        print

    print "=== Summary, should-vdj tests ===" + (' (only locus)' if args.after_two else '')
    print "            tested     passed     bug     failed (todo)"
    for locus in sorted(global_stats):
        print "    %-5s     %4d       %4d     %4d       %4d   %4s" % (locus, global_stats[locus], global_stats[locus] - global_stats_failed[locus], global_stats_bug[locus], global_stats_failed[locus],
                                                              ("(%d)" % global_stats_todo[locus] if global_stats_todo[locus] else ''))
    print "    =====     %4d       %4d     %4d       %4d   %4s" % (sum(global_stats.values()), sum(global_stats.values()) - sum(global_stats_failed.values()), sum(global_stats_bug.values()), sum(global_stats_failed.values()),
                                                           "(%d)" % sum(global_stats_todo.values()))
    print

    global_bug = sum(global_stats_bug.values())
    if global_bug < global_failed:
        print "! We were expecting %s failed tests, but there are %s such failures." % (global_bug, global_failed)
        sys.exit(1)
    if global_bug > global_failed:
        print "! There were less failed sequences that expected. Please update the files accordingly!"
        sys.exit(2)
