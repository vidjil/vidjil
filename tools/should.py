#!/usr/bin/env python3

# should.py -- Test command-line applications through .should files
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
# "should.py" is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU Lesser General Public License
# along with "should.py". If not, see <http://www.gnu.org/licenses/>

import sys

if not (sys.version_info >= (3, 5)):
    print("Python >= 3.5 required")
    sys.exit(1)

import re
import argparse
import subprocess
import time
import os.path
from collections import defaultdict

# Make sure the output is in utf8
sys.stdout = open(sys.stdout.fileno(), mode='w', encoding='utf8', buffering=1)
sys.stderr = open(sys.stderr.fileno(), mode='w', encoding='utf8', buffering=1)

DEFAULT_CFG = 'should.cfg'

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

EXT_SHOULD = '.should'
OUT_LOG = '.log'
OUT_TAP = '.tap'

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

STATUS_TAP = {
    None: 'not run',
    False: 'not ok',
    True: 'ok',
    SKIP: 'ok # SKIP',
    TODO: 'not ok # TODO',
    TODO_PASSED: 'ok # TODO',
}


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
  python3 %(prog)s demo/hello.should''',
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
output.add_argument('-v', '--verbose', action='count', help='increase verbosity', default=1)
output.add_argument('-q', '--quiet', action='store_const', dest='verbose', const=0, help='verbosity to zero')

parser.add_argument('file', metavar='should-file', nargs='+', help='''input files (.should)''')


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



class Stats():
    '''
    >>> s = Stats('foo')
    >>> s[2] += 1
    >>> list(s.keys())
    [2]

    >>> t = Stats()
    >>> t[2] += 1
    >>> t[3] += 1

    >>> u = s + t
    >>> sorted(u.keys())
    [2, 3]
    >>> list(s.keys())
    [2]
    '''

    def __init__(self, item=''):
        self.stats = defaultdict(int)
        self.item = item

    def __getitem__(self, key):
        return self.stats[key]

    def __setitem__(self, key, value):
        self.stats[key] = value

    def keys(self):
        return self.stats.keys()

    def __add__(self, other):
        result = Stats(self.item)
        for data in (self, other):
            for key in data.keys():
                result[key] += data[key]
        return result

    def str_status(self, status, colorize=True):
        s = '==> '
        s += STATUS[status]
        s += ' - '
        s += ' '.join(['%s:%d' % (STATUS[key], val) for (key, val) in self.stats.items()] + ['total:%s' %  sum(self.stats.values())])
        if self.item:
            s += ' ' + self.item + ('s' if sum(self.stats.values()) > 1 else '')
        return color(STATUS_COLORS[status], s, colorize)




class TestAbstract:
    def __init__(self):
        raise NotImplemented

    def str_additional_status(self, verbose=False):
        return ''

    def str_status(self, verbose=False, names=STATUS):
        s = ''
        s += names[self.status]
        s += self.str_additional_status(verbose)

        return s

    def tap(self, names=STATUS_TAP):
        s = []

        if self.status is not None:
            s.append(self.str_status(names=names))

        if self.name:
            s.append(self.name)

        return ' - '.join(s)

    def __str__(self):
        return self.tap(names=STATUS)


class Test(TestAbstract):
    def __init__(self, name, status, info=''):
        self.name = name
        self.status = status
        self.info = info

    def str_additional_status(self, verbose = False):
        s = ''
        if self.status == False or verbose:
            s += ' (%s)' % self.info
        return s

    def test(self, *args, **kwargs):
        pass

class TestLine(TestAbstract):
    '''
    >>> test = TestLine('', 'hello')
    >>> repr(test)
    ':hello'

    >>> test.str_status()
    'not run'

    >>> test.test(['world'])
    False

    >>> test.status
    False

    >>> test.test(['hello'])
    True


    >>> test = TestLine('3', 'hello')
    >>> repr(test)
    '3:hello'

    >>> test.test(['hello'])
    False
    >>> test.count
    1
    >>> print(test)
    failed (1/3)
    >>> test.tap()
    'not ok (1/3)'

    >>> test.test(['hello'] * 3)
    True


    >>> TestLine('r2', ' e.*o ').test(['hello', 'ello', 'world'])
    True

    >>> TestLine('z1', ' e').test(['hello', 'h ello'])
    True

    >>> TestLine('rl', 'e.*o').test(['hel', 'lo'])
    True

    >>> TestLine('', 'e o').test(['e  o'])
    False

    >>> TestLine('f', 'e o').test(['e  o'])
    'TODO'

    >>> TestLine('b', 'e o').test(['e  o'])
    True

    >>> TestLine('b', 'e    o').test(['e  o'])
    True

    >>> TestLine('w2', 'o').test(['hello world'])
    True

    >>> TestLine('wW2', 'o').test(['hello world'])
    False

    >>> TestLine('wr2', 'a.c').test(['bli abc axc bla'])
    True


    >>> repr(TestLine('x3y', 'hello'))
    'xy3:hello'

    >>> print(TestLine('1x2', 'hello')) # doctest: +IGNORE_EXCEPTION_DETAIL
    Traceback (most recent call last):
     ...
    ShouldException: Error in parsing modifiers: 1x2
    '''

    def __init__(self, modifiers, expression, name=''):
        self.name = name
        self.status = None

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

        if self.status == False or verbose:
            s += ' (%s/%s)' % (self.count, self.expected_count if self.expected_count is not None else '+')

        return s

    def __repr__(self):
        return '%s%s:%s' % (self.modifiers, self.expected_count if self.expected_count is not None else '', self.expression)


class TestSet():
    '''
    >>> s = TestSet()
    >>> s.load(['echo "hello"', '$My test', ':hello'])
    >>> print(s)
    echo "hello"
    My test

    >>> s.test()
    True
    >>> s.tests[0].status
    True

    >>> s2 = TestSet('r')
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

    def __init__(self, modifiers = '', cd = None):
        self.requires = True
        self.requires_cmd = None
        self.cmds = []
        self.tests = []
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
                self.requires = (subprocess.run(self.requires_cmd, shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL).returncode == 0)
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
                self.tests.append(TestLine(self.modifiers + modifiers, expression, name))
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

    def skip_all(self):
        for test in self.tests:
            test.status = SKIP
            self.stats[test.status] += 1
        self.status = SKIP

    def test(self, variables=[], verbose=0, colorize=True):
        self.status = True

        if not self.requires :
            if verbose > 0:
                print('Skipping tests as condition is not met: %s' % self.requires_cmd)
            self.skip_all()
            return self.status

        variables_all = self.variables + variables
        if verbose > 1:
            print_variables(variables_all)

        if not self.use_launcher:
            if replace_variables(VAR_LAUNCHER, variables_all):
                if verbose > 0:
                    print('Skipping %s tests' % DIRECTIVE_NO_LAUNCHER)
                self.skip_all()
                return self.status

        start_time = time.time()

        cmd = ' ; '.join(self.cmds)

        if not VAR_LAUNCHER in cmd:
            cmd = VAR_LAUNCHER + ' ' + cmd
        cmd = replace_variables(cmd, variables_all)
        if self.cd:
            cmd = 'cd %s ; ' % self.cd + cmd
        if verbose > 0:
            print(color(ANSI.MAGENTA, cmd, colorize))
        p = subprocess.Popen([cmd], shell=True,
                             stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                             close_fds=True)

        try:
            self.exit_code = p.wait(TIMEOUT)
        except subprocess.TimeoutExpired:
            if verbose > 0:
                print('Timeout after %s seconds, skipping tests' % TIMEOUT)
            self.skip_all()
            return self.status

        self.stdout = [l.decode(errors='replace') for l in p.stdout.readlines()]
        self.stderr = [l.decode(errors='replace') for l in p.stderr.readlines()]

        self.tests.append(Test('Exit code is %d' % self.expected_exit_code, self.exit_code == self.expected_exit_code, str(self.exit_code)))

        if verbose > 0:
            self.print_stderr(colorize)

        self.test_lines = open(self.source).readlines() if self.source else self.stdout

        for test in self.tests:
            test.test(self.test_lines, variables=variables_all, verbose=verbose-1)
            self.stats[test.status] += 1

            if not test.status:
                self.status = False

            if verbose > 0 or test.status in [False, TODO_PASSED]:
                print(test)

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

    def tap(self):
        s = ''
        s += '1..%d' % len(self.tests) + '\n'
        s += '\n'.join(map(TestLine.tap, self.tests))
        s += '\n'
        return s

    def str_elapsed_time(self):
        return ('%.2fs' % self.elapsed_time) if self.elapsed_time is not None else ''

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
        self.modifiers = modifiers
        self.status = None
        self.stats = Stats('file')
        self.stats_tests = Stats('test')
        self.failed_files = []

    def test(self, variables=None, cd=None, cd_same=False, output=None, verbose=0):
        self.status = True

        for f in self.files:
            if verbose > 0:
                print(f)
            cd_f = os.path.dirname(f) if cd_same else cd
            s = TestSet(self.modifiers, cd_f)
            s.load(open(f))

            s.test(variables, verbose - 1)
            self.stats[s.status] += 1
            if not s.status:
                self.status = False
                self.failed_files.append(f)

            self.stats_tests += s.stats

            if output and OUT_LOG in output:
                write_to_file(f.replace(EXT_SHOULD, OUT_LOG), ''.join(s.test_lines))

            if output and OUT_TAP in output:
                write_to_file(f.replace(EXT_SHOULD, OUT_TAP), s.tap())

            if verbose > 0 or s.status is False:
                if not verbose:
                    print(f, end=' ')
                if s.elapsed_time:
                    if s.elapsed_time >= SHOW_ELAPSED_TIME_ABOVE:
                        print(s.str_elapsed_time())
                print(s.str_status())
                print('')

        print('Summary', end=' ')
        print(self.stats.str_status(self.status))
        print('Summary', end=' ')
        print(self.stats_tests.str_status(self.status))

        if self.failed_files:
            print('Failed files:')
            for f in self.failed_files:
                print(f)

        return self.status


if __name__ == '__main__':
    argv = (['@' + DEFAULT_CFG] + sys.argv[1:]) if os.path.exists(DEFAULT_CFG) else sys.argv[1:]
    args = parser.parse_args(argv)
    variables = populate_variables(args.var)
    variables.append((VAR_LAUNCHER, args.launcher))

    if args.verbose>0:
        print_variables(variables)

    fs = FileSet(args.file, modifiers=''.join(args.mod if args.mod else []))
    status = fs.test(variables = variables, cd = args.cd, cd_same = args.cd_same, output = args.output, verbose = args.verbose)
    sys.exit(0 if status else 1)


