#!/usr/bin/env python3

# should -- Test command-line applications through .should files
#
# Copyright (C) 2018 by CRIStAL (UMR CNRS 9189, Université Lille) and Inria Lille
# Contributors:
#     Mathieu Giraud <mathieu.giraud@vidjil.org>
#     Mikaël Salson <mikael.salson@vidjil.org>
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU Lesser General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# "should" is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU Lesser General Public License
# along with "should". If not, see <http://www.gnu.org/licenses/>

import sys

if not (sys.version_info >= (3, 4)):
    print("Python >= 3.4 required")
    sys.exit(1)

import re
import argparse
import subprocess
import time
import os.path
from collections import defaultdict, OrderedDict
import xml.etree.ElementTree as ET
import datetime

# Make sure the output is in utf8
sys.stdout = open(sys.stdout.fileno(), mode='w', encoding='utf8', buffering=1)
sys.stderr = open(sys.stderr.fileno(), mode='w', encoding='utf8', buffering=1)

DEFAULT_CFG = 'should.cfg'
RETRY = 'should.retry'
RETRY_FLAG = '--retry'

TOKEN_COMMENT = '#'
TOKEN_DIRECTIVE = '!'
TOKEN_NAME = '$'
TOKEN_TEST = ':'
RE_TEST = re.compile('^(\S)*[:]')

DIRECTIVE_REQUIRES = '!REQUIRES:'
DIRECTIVE_NO_LAUNCHER = '!NO_LAUNCHER:'
DIRECTIVE_SCRIPT = '!LAUNCH:'
DIRECTIVE_OPTIONS = '!OPTIONS:'
DIRECTIVE_SOURCE = '!OUTPUT_FILE:'
DIRECTIVE_EXIT_CODE = '!EXIT_CODE:'

VAR_LAUNCHER = '$LAUNCHER'

MOD_TODO = 'f'
MOD_REGEX = 'r'
MOD_COUNT_ALL = 'w'
MOD_BLANKS = 'b'
MOD_MULTI_LINES = 'l'
MOD_KEEP_LEADING_TRAILING_SPACES = 'z'

TIMEOUT = 120
SHOW_ELAPSED_TIME_ABOVE = 1.0

RE_MODIFIERS = re.compile('^(\D*)(\d*)(\D*)$')

OUT_LOG = '.log'
OUT_TAP = '.tap'
OUT_XML = 'should.xml'

LINE = '-' * 40
ENDLINE_CHARS = '\r\n'
CONTINUATION_CHAR = '\\'
MAX_DUMP_LINES = 100

SKIP = 'SKIP'

TODO = 'TODO'
TODO_PASSED = 'TODO_PASSED'

STATUS = {
    None: 'not run',
    False: 'failed',
    True: 'ok',
    SKIP: 'skip',
    TODO: 'TODO',
    TODO_PASSED: 'TODO-but-ok',
}

WARN_STATUS = [False, SKIP, TODO, TODO_PASSED]

STATUS_TAP = {
    None: 'not run',
    False: 'not ok',
    True: 'ok',
    SKIP: 'ok # SKIP',
    TODO: 'not ok # TODO',
    TODO_PASSED: 'ok # TODO',
}

STATUS_XML = STATUS.copy()
STATUS_XML[False] = 'failure'
STATUS_XML[SKIP] = 'skipped'


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
    return CSIm % ANSI.BRIGHT + CSIm % col + text + CSIm % ANSI.RESET

STATUS_COLORS = {
    None: ANSI.BLUE,
    False: ANSI.RED,
    True: ANSI.GREEN,
    SKIP: ANSI.BLUE,
    TODO: ANSI.BLUE,
    TODO_PASSED: ANSI.BLUE,
}

# Modifier parser

MODIFIERS = [
    (MOD_TODO, 'todo', 'consider that the test should fail'),
    (MOD_REGEX, 'regex', 'consider as a regular expression'),
    (MOD_COUNT_ALL, 'count-all', 'count all occurrences, even on a same line'),
    (MOD_BLANKS, 'blanks', "ignore whitespace differences as soon as there is at least one space. Implies 'r'"),
    (MOD_MULTI_LINES, 'multi-lines', 'search on all the output rather than on every line'),
    (MOD_KEEP_LEADING_TRAILING_SPACES, 'ltspaces', 'keep leading and trailing spaces'),
]



class ArgParser(argparse.ArgumentParser):

    def convert_arg_line_to_args(self, l):
        '''
        More flexible argument parsing from configuration file:
          - ignore leading and trailing spaces
          - allow empty lines
        '''
        ll = l.strip()
        return [ ll ] if ll else [ ]


class ModifierParser(ArgParser):

    def parse_modifiers(self, modifiers):
        mods, unknown = self.parse_known_args(['-' + mod for mod in modifiers])
        return mods

parser_mod = ModifierParser()
parser_mod.help = 'modifiers (uppercase letters cancel previous modifiers)\n'

for (mod_char, mod_long, mod_help) in MODIFIERS:
    parser_mod.add_argument('-' + mod_char, '--' + mod_long, action='store_true', help=mod_help)
    parser_mod.add_argument('-' + mod_char.upper(), dest=mod_long.replace('-', '_'), action='store_const', const=False, default=False,
                            help='back to default, overriding any previous -%s' % mod_char)

    parser_mod.help += '  %s/%s %s\n' % (mod_char, mod_char.upper(), mod_help)

# Main argument parser

parser = ArgParser(description='Test command-line applications through .should files',
                   fromfile_prefix_chars='@',
                   epilog='''Example:
  %(prog)s demo/hello.should''',
                                 formatter_class=argparse.RawTextHelpFormatter)

options = ArgParser(fromfile_prefix_chars='@') # Can be used in !OPTIONS: directive

for p in (parser, options):
    p.add_argument('--cd', metavar='PATH', help='directory from which to run the test commands')
    p.add_argument('--cd-same', action='store_true', help='run the test commands from the same directory as the .should files')
    p.add_argument('--launcher', metavar='CMD', default='', help='launcher preceding each command (or replacing %s)' % VAR_LAUNCHER)
    p.add_argument('--mod', metavar='MODIFIERS', action='append', help='global ' + parser_mod.help)
    p.add_argument('--var', metavar='NAME=value', action='append', help='variable definition (then use $NAME in .should files)')

output = parser.add_argument_group('output options')

output.add_argument('--log', action='append_const', dest='output', const=OUT_LOG, help='stores the output into .log files')
output.add_argument('--tap', action='append_const', dest='output', const=OUT_TAP, help='outputs .tap files')
output.add_argument('--xml', action='append_const', dest='output', const=OUT_XML, help='outputs JUnit-like XML into %s' % OUT_XML)
output.add_argument('-v', '--verbose', action='count', help='increase verbosity', default=1)
output.add_argument('-q', '--quiet', action='store_const', dest='verbose', const=0, help='verbosity to zero')

parser.add_argument('file', metavar='should-file', nargs='+', help='''input files (.should)''')
parser.add_argument(RETRY_FLAG, action='store_true', help='launch again the last failed or warned tests')

class ShouldException(BaseException):
    pass


def write_to_file(f, what):
    print('==> %s' % f)
    with open(f, 'w', encoding='utf-8') as ff:
        ff.write(what)

# Variables definition and expansion

def populate_variables(var):
    '''
    >>> populate_variables(['ab=cd', 'ef=xyz'])
    [('$ab', 'cd'), ('$ef', 'xyz')]
    '''

    variables = []

    if var:
        for v in var:
            try:
                key, var = v.split('=')
                variables.append(('$' + key, var))

            except IOError:
                raise ShouldException('Error in parsing variable definition: ' + v)
    return variables


def print_variables(variables):
    for (k, v) in variables:
        print('%s=%s' % (k, v))
    print('')

def replace_variables(s, variables):
    '''
    >>> replace_variables('hello', None)
    'hello'

    >>> replace_variables('hello', [('hell', 'w'), ('o', 'orld')])
    'world'

    >>> replace_variables('xyz xyz', [('y', 'abc')])
    'xabcz xabcz'
    '''

    if variables:
        for (key, val) in variables:
            s = s.replace(key, val)
    return s


class OrderedDefaultListDict(OrderedDict):
    def __missing__(self, key):
        self[key] = value = []
        return value

class Stats():
    '''
    >>> s = Stats('foo')
    >>> s.up(2)
    >>> list(s.keys())
    [2]
    >>> s[2]
    [1]

    >>> t = Stats()
    >>> t.up(2, 'hello')
    >>> t.up(3)

    >>> u = s + t
    >>> sorted(u.keys())
    [2, 3]
    >>> list(s.keys())
    [2]

    >>> sorted(u.items())
    [(2, [1, 'hello']), (3, [1])]
    '''

    def __init__(self, item=''):
        self.stats = OrderedDefaultListDict()
        self.item = item

    def __getitem__(self, key):
        return self.stats[key]

    def up(self, key, data=1):
        self.stats[key].append(data)

    def __setitem__(self, key, value):
        self.stats[key] = value

    def keys(self):
        return self.stats.keys()

    def items(self):
        return self.stats.items()

    def values(self):
        return self.stats.values()

    def total(self):
        return sum(map(len, self.stats.values()))

    def __add__(self, other):
        result = Stats(self.item)
        for data in (self, other):
            for key in data.keys():
                result.stats[key] += data.stats[key]
        return result

    def str_status(self, status, colorize=True):
        s = '==> '
        s += STATUS[status]
        s += ' - '
        s += ' '.join(['%s:%d' % (STATUS[key], len(val)) for (key, val) in self.items()] + ['total:%s' % self.total()])
        if self.item:
            s += ' ' + self.item + ('s' if self.total() > 1 else '')
        return color(STATUS_COLORS[status], s, colorize)




class TestCaseAbstract:
    def __init__(self):
        raise NotImplemented

    def str_additional_status(self, verbose=False):
        return ''

    def str_status(self, verbose=False, names=STATUS, colorize=True):
        s = ''
        s += color(STATUS_COLORS[self.status], names[self.status], colorize)
        s += self.str_additional_status(verbose)

        return s

    def xml(self):
        x = ET.Element('testcase', {'name': self.name, 'status': STATUS_XML[self.status]})
        if self.status in WARN_STATUS:
            x.append(ET.Element(STATUS_XML[self.status],
                                {'message': repr(self) + '\n' + self.str_status(names=STATUS_XML, colorize = False)}))
        return x

    def tap(self, names=STATUS_TAP, colorize=False):
        s = []

        if self.status is not None:
            s.append(self.str_status(names=names, colorize=colorize))

        if self.name:
            s.append(self.name)

        return ' - '.join(s)

    def str(self, colorize):
        return self.tap(names=STATUS, colorize=colorize)

    def __str__(self):
        return self.str(colorize=True)

    def __repr__(self):
        raise NotImplemented

class ExternalTestCase(TestCaseAbstract):
    def __init__(self, name, status, info=''):
        self.name = name
        self.status = status
        self.info = info

    def str_additional_status(self, verbose = False):
        s = ''
        if self.status in WARN_STATUS or verbose:
            s += ' (%s)' % self.info
        return s

    def test(self, *args, **kwargs):
        pass

    def __repr__(self):
        return self.info


class TestCase(TestCaseAbstract):
    '''
    >>> test = TestCase('', 'hello')
    >>> repr(test)
    ':hello'

    >>> test.str_status(colorize=False)
    'not run'

    >>> test.test(['world'])
    False

    >>> test.status
    False

    >>> test.test(['hello'])
    True


    >>> test = TestCase('3', 'hello')
    >>> repr(test)
    '3:hello'

    >>> test.test(['hello'])
    False
    >>> test.count
    1
    >>> print(test.str(colorize=False))
    failed (1/3)
    >>> test.tap()
    'not ok (1/3)'

    >>> test.test(['hello'] * 3)
    True


    >>> TestCase('r2', ' e.*o ').test(['hello', 'ello', 'world'])
    True

    >>> TestCase('z1', ' e').test(['hello', 'h ello'])
    True

    >>> TestCase('rl', 'e.*o').test(['hel', 'lo'])
    True

    >>> TestCase('', 'e o').test(['e  o'])
    False

    >>> TestCase('f', 'e o').test(['e  o'])
    'TODO'

    >>> TestCase('b', 'e o').test(['e  o'])
    True

    >>> TestCase('b', 'e    o').test(['e  o'])
    True

    >>> TestCase('w2', 'o').test(['hello world'])
    True

    >>> TestCase('wW2', 'o').test(['hello world'])
    False

    >>> TestCase('wr2', 'a.c').test(['bli abc axc bla'])
    True


    >>> repr(TestCase('x3y', 'hello'))
    'xy3:hello'

    >>> print(TestCase('1x2', 'hello')) # doctest: +IGNORE_EXCEPTION_DETAIL
    Traceback (most recent call last):
     ...
    ShouldException: Error in parsing modifiers: 1x2
    '''

    def __init__(self, modifiers, expression, name=''):
        self.name = name
        self.status = None
        self.count = '?'

        # Extract self.expected_count from modifiers
        m = RE_MODIFIERS.match(modifiers)
        if not m:
            raise ShouldException('Error in parsing modifiers: ' + modifiers)
        self.modifiers = m.group(1) + m.group(3)
        self.expected_count = int(m.group(2)) if m.group(2) else None

        # Parse modifiers
        self.mods = parser_mod.parse_modifiers(self.modifiers)

        self.expression = expression if self.mods.ltspaces else expression.strip()
        if self.mods.blanks:
            while '  ' in self.expression:
                self.expression = self.expression.replace('  ', ' ')
            self.expression = self.expression.replace(' ', '\s+')
            self.mods.regex = True
        self.regex = re.compile(self.expression) if self.mods.regex else None

    def test(self, lines, variables=None, verbose=0):
        if self.mods.multi_lines:
            lines = [' '.join([l.rstrip(ENDLINE_CHARS) for l in lines])]

        expression_var = replace_variables(self.expression, variables)

        self.count = 0
        for l in lines:
            if self.regex:
                if self.mods.count_all:
                    self.count += len(self.regex.findall(l))
                elif self.regex.search(l):
                    self.count += 1
            elif expression_var in l:
                self.count += l.count(expression_var) if self.mods.count_all else 1

        self.status = (self.count > 0) if self.expected_count is None else (self.count == self.expected_count)

        if self.mods.todo:
            self.status = [TODO, TODO_PASSED][self.status]

        if verbose > 0:
            print('')
            print(self.str_status(True) + ' ' + repr(self))

        return self.status

    def str_additional_status(self, verbose=False):
        s = ''

        if self.status in WARN_STATUS or verbose:
            s += ' (%s/%s)' % (self.count, self.expected_count if self.expected_count is not None else '+')

        return s

    def __repr__(self):
        return '%s%s:%s' % (self.modifiers, self.expected_count if self.expected_count is not None else '', self.expression)


class TestSuite():
    '''
    >>> s = TestSuite()
    >>> s.load(['echo "hello"', '$My test', ':hello'])
    >>> print(s)
    echo "hello"
    My test

    >>> s.test()
    True
    >>> s.tests[0].status
    True

    >>> s2 = TestSuite('r')
    >>> s2.variables.append(("$LAUNCHER", ""))
    >>> s2.load(['echo "hello"', '$ A nice test', ':e.*o'])
    >>> s2.test(verbose = 1, colorize = False)   # doctest: +NORMALIZE_WHITESPACE
    echo "hello"
      stdout --> 1 lines
      stderr --> 0 lines
    ok - A nice test
    ok - Exit code is 0
    True

    >>> s2.str_status(colorize = False)
    '==> ok - ok:2 total:2 tests'

    >>> print(s2.tap())   # doctest: +NORMALIZE_WHITESPACE
    1..2
    ok - A nice test
    ok - Exit code is 0
    '''

    def __init__(self, modifiers = '', cd = None, name = ''):
        self.name = name
        self.requires = True
        self.requires_cmd = None
        self.requires_stderr = []
        self.cmds = []
        self.tests = []
        self.stdin = []
        self.stdout = []
        self.test_lines = []
        self.status = None
        self.modifiers = modifiers
        self.variables = []
        self.stats = Stats('test')
        self.source = None
        self.cd = cd
        self.use_launcher = True
        self.expected_exit_code = 0
        self.elapsed_time = None

    def load(self, should_lines):
        name = ''
        this_cmd_continues = False
        for l in should_lines:

            l = l.lstrip().rstrip(ENDLINE_CHARS)
            if not l:
                continue

            # Comment
            if l.startswith(TOKEN_COMMENT):
                continue

            # Directive -- Requires
            if l.startswith(DIRECTIVE_REQUIRES):
                self.requires_cmd = l[len(DIRECTIVE_REQUIRES):].strip()
                continue

            # Directive -- No launcher
            if l.startswith(DIRECTIVE_NO_LAUNCHER):
                self.use_launcher = False
                continue

            # Directive -- Source
            if l.startswith(DIRECTIVE_SOURCE):
                self.source = os.path.join(self.cd if self.cd else '', l[len(DIRECTIVE_SOURCE):].strip())
                continue

            # Directive -- Options
            if l.startswith(DIRECTIVE_OPTIONS):
                opts, unknown = options.parse_known_args(l[len(DIRECTIVE_OPTIONS):].split())
                self.variables += populate_variables(opts.var)
                continue

            # Directive -- Exit code
            if l.startswith(DIRECTIVE_EXIT_CODE):
                self.expected_exit_code = int(l[len(DIRECTIVE_EXIT_CODE):].strip())
                continue

            # Name
            if l.startswith(TOKEN_NAME):
                name = l[1:].strip()
                continue

            # Directive -- Command
            if l.startswith(DIRECTIVE_SCRIPT):
                l = l[len(DIRECTIVE_SCRIPT):]

            # Directive -- Others
            if l.startswith(TOKEN_DIRECTIVE):
                sys.stderr.write('! Unknown directive: %s\n' % l)
                continue

            # Test
            if RE_TEST.search(l):
                pos = l.find(TOKEN_TEST)
                modifiers, expression = l[:pos], l[pos+1:]
                self.tests.append(TestCase(self.modifiers + modifiers, expression, name))
                continue

            # Command
            next_cmd_continues = l.endswith(CONTINUATION_CHAR)
            if next_cmd_continues:
                l = l[:-1]

            if this_cmd_continues:
                self.cmds[-1] += l
            else:
                self.cmds.append(l)

            this_cmd_continues = next_cmd_continues


    def print_stderr(self, colorize=True):
        print('  stdout --> %s lines' % len(self.stdout))
        print('  stderr --> %s lines' % len(self.stderr))
        print(color(ANSI.CYAN, ''.join(self.stderr), colorize))

    def skip_all(self, reason, verbose=1):
        if verbose > 0:
            print('Skipping tests: %s' % reason)
        for test in self.tests:
            test.status = SKIP
            self.stats.up(test.status)
        self.status = SKIP

    def test(self, variables=[], verbose=0, colorize=True):

        self.variables_all = self.variables + variables
        if verbose > 1:
            print_variables(self.variables_all)

        def cmd_variables_cd(cmd):
            cmd = replace_variables(cmd, self.variables_all)
            if self.cd:
                cmd = 'cd %s ; ' % self.cd + cmd
            if verbose > 0:
                print(color(ANSI.MAGENTA, cmd, colorize))
            return cmd

        self.status = True

        if self.requires_cmd:
            requires_cmd = cmd_variables_cd(self.requires_cmd)
            p = subprocess.Popen(requires_cmd, shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
            self.requires = (p.wait() == 0)
            self.requires_stderr = [l.decode(errors='replace') for l in p.stderr.readlines()]
            if verbose > 0:
                print(color(ANSI.CYAN, ''.join(self.requires_stderr), colorize))

            if not self.requires:
                self.skip_all('Condition is not met: %s' % self.requires_cmd, verbose)
                return self.status

        if not self.use_launcher:
            if replace_variables(VAR_LAUNCHER, self.variables_all):
                self.skip_all('%s while %s is given' % (DIRECTIVE_NO_LAUNCHER, VAR_LAUNCHER), verbose)
                return self.status

        start_time = time.time()

        cmd = ' ; '.join(self.cmds)

        if not VAR_LAUNCHER in cmd:
            cmd = VAR_LAUNCHER + ' ' + cmd

        cmd = cmd_variables_cd(cmd)

        p = subprocess.Popen([cmd], shell=True,
                             stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                             close_fds=True)

        try:
            self.exit_code = p.wait(TIMEOUT)
            self.tests.append(ExternalTestCase('Exit code is %d' % self.expected_exit_code, self.exit_code == self.expected_exit_code, str(self.exit_code)))
        except subprocess.TimeoutExpired:
            self.exit_code = None
            self.tests.append(ExternalTestCase('Exit code is %d' % self.expected_exit_code, SKIP, 'timeout after %s seconds' % TIMEOUT))

        self.stdout = [l.decode(errors='replace') for l in p.stdout.readlines()]
        self.stderr = [l.decode(errors='replace') for l in p.stderr.readlines()]



        if verbose > 0:
            self.print_stderr(colorize)

        self.test_lines = open(self.source).readlines() if self.source else self.stdout

        for test in self.tests:
            test.test(self.test_lines, variables=self.variables_all, verbose=verbose-1)
            self.stats.up(test.status)

            # When a test fails, the file fails
            if test.status is False:
                self.status = False

            # When the file is not failing, we may report a more sublte status
            if test.status in WARN_STATUS and self.status is True:
                self.status = test.status

            if verbose > 0 or test.status in WARN_STATUS:
                print(test.str(colorize))

        if self.status is False and verbose <= 0:
            print(color(ANSI.MAGENTA, cmd, colorize))
            self.print_stderr(colorize)

        if self.status is False or verbose > 1:
            print(LINE)
            print(''.join(self.test_lines[:MAX_DUMP_LINES]))
            print(LINE)

        self.elapsed_time = time.time() - start_time

        return self.status

    def str_status(self, colorize=True):
        return self.stats.str_status(self.status, colorize)

    def xml(self):
        x = ET.Element('testsuite',
                       {'id': self.name,
                        'name': self.name,
                        'cmd': str(self.cmds),
                        'tests': str(self.stats.total()),
                        'failures': str(len(self.stats[False])),
                        'skipped': str(len(self.stats[SKIP])),
                        'time': self.str_elapsed_time(tag=''),
                        'timestamp': datetime.datetime.now().isoformat()
                       })
        for test in self.tests:
            x.append(test.xml())

        v = ET.Element('properties')
        for (key, val) in self.variables_all:
            v.append(ET.Element('property', {'name': key, 'value': val}))
        x.append(v)

        return x

    def tap(self):
        s = ''
        s += '1..%d' % len(self.tests) + '\n'
        s += '\n'.join(map(TestCase.tap, self.tests))
        s += '\n'
        return s

    def str_elapsed_time(self, tag='s'):
        return ('%.2f%s' % (self.elapsed_time, tag)) if self.elapsed_time is not None else ''

    def __str__(self):
        s = ''
        s += '\n'.join(self.cmds)
        s += '\n'
        s += self.str_elapsed_time()
        s += '\n'.join(map(str,self.tests))
        if self.status is not None:
            s += '\n'
            s += self.str_status()
        return s


class FileSet():

    def __init__(self, files, modifiers = ''):
        self.files = files
        self.sets = []
        self.modifiers = modifiers
        self.status = None
        self.stats = Stats('file')
        self.stats_tests = Stats('test')

    def test(self, variables=None, cd=None, cd_same=False, output=None, verbose=0):
        self.status = True

        try:
          for f in self.files:
            if verbose > 0:
                print(f)
            cd_f = os.path.dirname(f) if cd_same else cd
            s = TestSuite(self.modifiers, cd_f, name = f)
            self.sets.append(s)
            s.load(open(f))

            s.test(variables, verbose - 1)
            self.stats.up(s.status, f)
            if not s.status:
                self.status = False

            self.stats_tests += s.stats

            filename_without_ext = os.path.splitext(f)[0]

            if output and OUT_LOG in output:
                write_to_file(filename_without_ext + OUT_LOG, ''.join(s.test_lines))

            if output and OUT_TAP in output:
                write_to_file(filename_without_ext + OUT_TAP, s.tap())

            if verbose > 0 or s.status is False:
                if not verbose:
                    print(f, end=' ')
                if s.elapsed_time:
                    if s.elapsed_time >= SHOW_ELAPSED_TIME_ABOVE:
                        print(s.str_elapsed_time())
                print(s.str_status())
                print('')
        except KeyboardInterrupt:
            print('==== interrupted ====\n')

        if output and OUT_XML in output:
            self.xml().write(OUT_XML)

        print('Summary', end=' ')
        print(self.stats.str_status(self.status))
        print('Summary', end=' ')
        print(self.stats_tests.str_status(self.status))

        for sta in self.stats.keys():
            if sta == True:
                continue
            print('files with %s:' % color(STATUS_COLORS[sta], STATUS[sta]))
            for f in self.stats[sta]:
                print('  ' + f)

        return self.status

    def xml(self):
        x = ET.Element('testsuites',
                       {'id': 'Test at %s' % datetime.datetime.now().isoformat(),
                        'name': 'tested by should',
                        'tests': str(self.stats_tests.total()),
                        'failures': str(len(self.stats_tests[False])),
                       })

        for s in self.sets:
            x.append(s.xml())

        return ET.ElementTree(x)

    def write_retry(self, argv, argv_remove, verbose=1):
        '''
        If there were tests in WARN_STATUS, write the RETRY file
        with, non-file arguments and WARN_STATUS files.
        '''

        # cmd = [sys.executable, sys.argv[0]]

        files = []

        for sta in WARN_STATUS:
            files += self.stats[sta]

        if not files:
            return

        args = []
        for arg in argv:
            if arg not in argv_remove:
                args.append(arg)

        with open(RETRY, 'w') as f:
            f.write('\n'.join(args + files) + '\n')

        if verbose > 0:
            print('%s %s will relaunch these tests.' % (sys.argv[0], RETRY_FLAG))

def read_retry():
    try:
        return [l.rstrip() for l in open(RETRY).readlines()]
    except:
        return []


if __name__ == '__main__':
    argv = (['@' + DEFAULT_CFG] + sys.argv[1:]) if os.path.exists(DEFAULT_CFG) else sys.argv[1:]

    if RETRY_FLAG in argv:
        retry = read_retry()
        argv += retry
        if retry:
            print(color(ANSI.BLUE, "Retrying previous failed or warned tests"))
        else:
            print(color(ANSI.RED, "Nothing to retry"))
            sys.exit(2)

    args = parser.parse_args(argv)
    variables = populate_variables(args.var)
    variables.append((VAR_LAUNCHER, args.launcher))

    if args.verbose>0:
        print_variables(variables)

    fs = FileSet(args.file, modifiers=''.join(args.mod if args.mod else []))
    status = fs.test(variables = variables, cd = args.cd, cd_same = args.cd_same, output = args.output, verbose = args.verbose)

    retry = fs.write_retry(sys.argv[1:], args.file, verbose = args.verbose)

    sys.exit(0 if status else 1)


