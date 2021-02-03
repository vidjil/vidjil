#!/usr/bin/env python3

# should -- Test command-line applications through .should files
#
# Copyright (C) 2018-2020 by CRIStAL (UMR CNRS 9189, Université Lille) and Inria Lille
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

__version_info__ = ('3','0','0')
__version__ = '.'.join(__version_info__)

import re
import argparse
import subprocess
import time
import random
import os.path
from collections import defaultdict, OrderedDict
import xml.etree.ElementTree as ET
import datetime
import tempfile
import json

# Make sure the output is in utf8
sys.stdout = open(sys.stdout.fileno(), mode='w', encoding='utf8', buffering=1)
sys.stderr = open(sys.stderr.fileno(), mode='w', encoding='utf8', buffering=1)

DEFAULT_CFG = 'should.cfg'
RETRY_FAILED = 'should.retry'
RETRY_FAILED_FLAG = '--retry'
RETRY_WARNED = 'should.warned.retry'
RETRY_WARNED_FLAG = '--retry-warned'

TOKEN_COMMENT = '#'
TOKEN_DIRECTIVE = '!'
TOKEN_NAME = '$'
TOKEN_TEST = ':'
RE_TEST = re.compile('^(\S)*[:]')

DIRECTIVE_REQUIRES = '!REQUIRES:'
DIRECTIVE_NO_LAUNCHER = '!NO_LAUNCHER:'
DIRECTIVE_SCRIPT = '!LAUNCH:'
DIRECTIVE_NO_EXTRA = '!NO_EXTRA:'
DIRECTIVE_OPTIONS = '!OPTIONS:'
DIRECTIVE_SOURCE = '!OUTPUT_FILE:'
DIRECTIVE_EXIT_CODE = '!EXIT_CODE:'

VAR_LAUNCHER = '$LAUNCHER'
VAR_EXTRA = '$EXTRA'

MOD_TODO = 'f'
MOD_ALLOW = 'a'
MOD_REGEX = 'r'
MOD_COUNT_ALL = 'w'
MOD_IGNORE_CASE = 'i'
MOD_BLANKS = 'b'
MOD_MULTI_LINES = 'l'
MOD_KEEP_LEADING_TRAILING_SPACES = 'z'
MOD_JSON = 'j'

MOD_MORE_THAN = '>'
MOD_LESS_THAN = '<'

TIMEOUT = 120
SHOW_ELAPSED_TIME_ABOVE = 1.0

RE_MODIFIERS = re.compile('^(\D*)(\d*)(\D*)$')

OUT_LOG = '.log'
OUT_TAP = '.tap'
OUT_XML = 'should.xml'

TAP = 'tap'
XML = 'xml'

JSON_KEY_NOT_FOUND = 'not found'

LINE = '-' * 40
ENDLINE_CHARS = '\r\n'
CONTINUATION_CHAR = '\\'
MAX_HALF_DUMP_LINES = 45
MAX_DUMP_LINES = 2*MAX_HALF_DUMP_LINES + 10

NOT_ZERO = '+'

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


# Status

S_FAILED = 'failed'
S_TODO_PASSED = 'TODO-but-ok'
S_TODO = 'TODO'
S_AF = 'failed-but-ALLOW'
S_SKIP = 'skip'
S_OK = 'ok'
S_NOT_RUN = 'not-run'

FAIL_STATUS = [S_FAILED, S_TODO_PASSED]
WARN_STATUS = FAIL_STATUS + [S_AF, S_TODO, S_SKIP]

NO_ALIAS = 'no-alias'

class Status():

    ALL = []

    def __init__(self, num, name, color, tap_str, alias=NO_ALIAS):
        self.num = num
        self.name = name
        self.color = color
        self.tap_str = tap_str
        self.alias = alias

    def is_failed(self):
        return self.name in FAIL_STATUS

    def is_warned(self):
        return self.name in WARN_STATUS

    def tap(self):
        return self.tap_str

    def xml(self):
        if self.name == S_FAILED:
            return 'failure'
        if self.name == S_SKIP:
            return 'skipped'
        return self.name

    def out(self, format, colorize=True):
        if format == XML:
            return self.xml()
        if format == TAP:
            return self.tap()
        return self.__str__(colorize)

    def or_alias(self):
        if self.alias == NO_ALIAS:
            return self.name
        return self.alias

    def __hash__(self):
        return hash(self.name)

    def __add__(self, other):
        '''
        >>> (Sta(S_NOT_RUN) + Sta(S_OK)).name == S_OK
        True

        >>> (Sta(S_TODO) + Sta(S_FAILED)).name == S_FAILED
        True

        >>> (Sta(S_OK) + Sta(S_SKIP)).name == S_SKIP
        True

        >>> (Sta(S_TODO_PASSED) + Sta(S_OK)).name == S_TODO_PASSED
        True
        '''

        return self if self.num > other.num else other

    def __str__(self, colorize=True):
        return '%s' % color(self.color, self.name, colorize)


Status.ALL = [# name            color       tap              alias
    # S_FAILED
    Status(99,  S_FAILED,       ANSI.RED,   'not ok',        alias=False),
    Status(98,  S_TODO_PASSED,  ANSI.RED,   'ok # TODO'),
    # Warned
    Status(12,  S_TODO,         ANSI.CYAN,  'not ok # TODO',),
    Status(11,  S_AF,           ANSI.CYAN,  'not ok # SKIP'),
    Status(10,  S_SKIP,         ANSI.CYAN,  'ok # SKIP'),
    # Passed
    Status( 1,  S_OK,           ANSI.GREEN, 'ok',            alias=True),
    # Forgotten status when mixed to other tests
    Status( 0,  S_NOT_RUN,      ANSI.CYAN,  'not run',       alias=None),
]

def Sta(sta = S_NOT_RUN):
    '''
    Get a constant status, from Status.ALL, by its name or its alias
    '''
    for s in Status.ALL:
        if s.alias == sta or s.name == sta:
            return s
    return None

# Modifier parser

MODIFIERS = [
    (MOD_TODO, 'todo', 'consider that the test should fail'),
    (MOD_ALLOW, 'allow', 'consider that the test is allowed to fail'),
    (MOD_REGEX, 'regex', 'consider as a regular expression'),
    (MOD_COUNT_ALL, 'count-all', 'count all occurrences, even on a same line'),
    (MOD_IGNORE_CASE, 'ignore-case', 'ignore case changes'),
    (MOD_BLANKS, 'blanks', "ignore whitespace differences as soon as there is at least one space. Implies 'r'"),
    (MOD_MULTI_LINES, 'multi-lines', 'search on all the output rather than on every line'),
    (MOD_KEEP_LEADING_TRAILING_SPACES, 'ltspaces', 'keep leading and trailing spaces'),
    (MOD_JSON, 'json', "interpret json data. Implies '" + MOD_MULTI_LINES + MOD_COUNT_ALL + "'"),

    (MOD_MORE_THAN, 'more-than', 'requires that the expression occurs strictly more than the given number'),
    (MOD_LESS_THAN, 'less-than', 'requires that the expression occurs strictly less than the given number'),
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
        for m in unknown:
            sys.stderr.write("! Unknown modifier '%s'\n" % m[1])
        return mods

parser_mod = ModifierParser()
parser_mod.help = 'modifiers (uppercase letters cancel previous modifiers)\n'

for (mod_char, mod_long, mod_help) in MODIFIERS:
    parser_mod.add_argument('-' + mod_char, '--' + mod_long, action='store_true', help=mod_help)

    if mod_char.upper() != mod_char:
        parser_mod.add_argument('-' + mod_char.upper(), dest=mod_long.replace('-', '_'), action='store_const', const=False, default=False,
                                help='back to default, overriding any previous -%s' % mod_char)
        help_upper = '/%s' % mod_char.upper()
    else:
        help_upper = '  '

    parser_mod.help += '  %s%s %s\n' % (mod_char, help_upper, mod_help)

# Main argument parser

parser = ArgParser(description='Test command-line applications through .should files',
                   fromfile_prefix_chars='@',
                   epilog='''Example (see also README.md and demo/*.should):
  %(prog)s demo/hello.should''',
                   add_help=False,
                                 formatter_class=argparse.RawTextHelpFormatter)


options = ArgParser(fromfile_prefix_chars='@') # Can be used in !OPTIONS: directive

group = parser.add_argument_group('running tests (can also be set per test in !OPTIONS)')

for p in (group, options):
    p.add_argument('--cd', metavar='PATH', help='directory from which to run the test commands')
    p.add_argument('--cd-same', action='store_true', help='run the test commands from the same directory as the .should files')
    p.add_argument('--launcher', metavar='CMD', default='', help='launcher preceding each command (or replacing %s)' % VAR_LAUNCHER)
    p.add_argument('--extra', metavar='ARG', default='', help='extra argument after the first word of each command (or replacing %s)' % VAR_EXTRA)
    p.add_argument('--mod', metavar='MODIFIERS', action='append', help='global ' + parser_mod.help)
    p.add_argument('--var', metavar='NAME=value', action='append', help='variable definition (then use $NAME in .should files)')
    p.add_argument('--timeout', type=int, default = TIMEOUT, help = 'Delay (in seconds) after which the task is stopped (default: %(default)d)')

group = parser.add_argument_group('selecting tests to be run')

group.add_argument('--shuffle', action='store_true', help='shuffle the tests')
group.add_argument('--no-a', action='store_true', help="do not launch 'a' tests")
group.add_argument('--no-f', action='store_true', help="do not launch 'f' tests")
group.add_argument('--only-a', action='store_true', help="launches only 'a' tests")
group.add_argument('--only-f', action='store_true', help="launches only 'f' tests")

group.add_argument(RETRY_FAILED_FLAG, action='store_true', help='launches only the last failed tests')
group.add_argument(RETRY_WARNED_FLAG, action='store_true', help='launches only the last failed or warned tests')

output = parser.add_argument_group('controlling output')

output.add_argument('--log', action='append_const', dest='output', const=OUT_LOG, help='stores the output into .log files')
output.add_argument('--tap', action='append_const', dest='output', const=OUT_TAP, help='outputs .tap files')
output.add_argument('--xml', action='append_const', dest='output', const=OUT_XML, help='outputs JUnit-like XML into %s' % OUT_XML)
output.add_argument('-v', '--verbose', action='count', help='increase verbosity', default=1)
output.add_argument('-q', '--quiet', action='store_const', dest='verbose', const=0, help='verbosity to zero')

output.add_argument('--fail-a', action='store_true', help="fail on passing 'a' tests")
output.add_argument("-h", "--help", action="help", help="show this help message and exit")
output.add_argument('--version', action='version',
                    version='%(prog)s {version}'.format(version=__version__))


parser.add_argument('file', metavar='should-file', nargs='+', help='''input files (.should)''')

class ShouldException(BaseException):
    pass


def write_to_file(f, what, phony=True):
    if phony:
        print('==> %s' % f)
    with open(f, 'w', encoding='utf-8') as ff:
        ff.write(what)


RE_GETITEM = re.compile('(\S*?)\[(\S+?)\](\S*)$')

def deep_get(d, key, sep='.'):
    '''
    >>> d = {'1':{ '2': 3, '4': 5}, 'z': [6, {'a': 7}, [8, {'b': 9}]]}

    >>> deep_get(d, '1.2')
    3
    >>> deep_get(d, '3')
    Traceback (most recent call last):
    KeyError: '3'

    >>> deep_get(d, 'z[1].a')
    7
    >>> deep_get(d, 'z[2][0]')
    8
    >>> deep_get(d, 'z[2][1].b')
    9

    >>> deep_get(d, 'z[3]')
    Traceback (most recent call last):
    KeyError: 'z[3]'

    >>> deep_get(9, '')
    9
    >>> deep_get([1, 2, 3], '[1]')
    2
    '''

    def deep_get_(d, keys):
        if not keys:
            return d
        if not keys[0]:
            return d

        m = RE_GETITEM.match(keys[0])
        if m:
            key = m.group(1)
            index = int(m.group(2))
            s_index_next = m.group(3)

            if key:
                d = d[key]
            obj = d[index]

            if s_index_next:
                keys = [s_index_next] + keys[1:]
            else:
                keys = keys[1:]
        else:
            obj = d[keys[0]]
            keys = keys[1:]
        return deep_get_(obj, keys)

    try:
        return deep_get_(d, key.split(sep))
    except:
        raise KeyError(key)


# Command pre-processing

def pre_process(cmd):

    cc = cmd.split(' ')

    if not VAR_EXTRA in cmd:
        cc = [cc[0], VAR_EXTRA] + cc[1:]

    if not VAR_LAUNCHER in cmd:
        cc = [VAR_LAUNCHER] + cc

    return ' '.join(cc)


# Variables definition and expansion

def populate_variables(var):
    '''
    >>> populate_variables(['ab=cd', 'ef=xyz'])
    [('$ef', 'xyz'), ('$ab', 'cd')]
    '''

    variables = []

    if var:
        for v in var:
            try:
                key, var = v.split('=')
                variables = [('$' + key, var)] + variables

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

    def __iter__(self):
        '''Ordered according to Status.ALL'''
        for key in Status.ALL[::-1]:
            if key in self.stats:
                yield (key, self[key])

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
        s += status.name
        s += ' - '
        s = color(status.color, s, colorize)
        s += ' '.join([color(key.color, '%s:%d', colorize) % (key.name, len(val)) for (key, val) in self])

        nb_items = '- total:%s' % self.total()
        if self.item:
            nb_items += ' ' + self.item + ('s' if self.total() > 1 else '')
        s += ' ' + color(status.color, nb_items, colorize)

        return s




class TestCaseAbstract:
    def __init__(self):
        raise NotImplemented

    def str_additional_status(self, verbose=False):
        return ''

    def str(self, format=None, verbose=False, colorize=True):
        s = ''
        s += self.status.out(format=format,colorize=colorize)
        s += self.str_additional_status(verbose=verbose)

        if self.name:
            s += ' - ' + self.name

        return s

    def xml(self):
        x = ET.Element('testcase', {'name': self.name, 'status': self.status.xml()})
        if self.status.is_warned():
            x.append(ET.Element(self.status.xml(),
                                {'message': repr(self) + '\n' + self.str(format=XML, colorize=False)}))
        return x

    def tap(self, verbose=False):
        return self.str(format=TAP, colorize=False, verbose=False)

    def __str__(self):
        return self.str(colorize=True, verbose=True)

    def __repr__(self):
        raise NotImplemented

class ExternalTestCase(TestCaseAbstract):
    def __init__(self, name, sta, info=''):
        self.name = name
        self.status = Sta(sta)
        self.info = info
        self.modifiers = ''
        self.raw = None
        self.json_data = None

    def str_additional_status(self, verbose = False):
        s = ''
        if self.status.is_warned() or verbose:
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

    >>> test.str(colorize=False)
    'not-run'

    >>> test.test(['world'])
    False

    >>> test.status.or_alias()
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

    def __init__(self, modifiers, expression, name='', raw=''):
        self.name = name
        self.status = Sta()
        self.count = '?'
        self.raw = raw
        self.json_data = None

        # Extract self.expected_count from modifiers
        m = RE_MODIFIERS.match(modifiers)
        if not m:
            raise ShouldException('Error in parsing modifiers: ' + modifiers)
        self.modifiers = m.group(1) + m.group(3)
        self.expected_count = int(m.group(2)) if m.group(2) else NOT_ZERO

        # Parse modifiers
        self.mods = parser_mod.parse_modifiers(self.modifiers)

        if self.mods.json:
            es = expression.split(':')
            key, expression = es[0], ':'.join(es[1:])
            self.key = key.strip()
            self.mods.multi_lines = True
            self.mods.count_all = True

        self.expression = expression if self.mods.ltspaces else expression.strip()
        if self.mods.blanks:
            while '  ' in self.expression:
                self.expression = self.expression.replace('  ', ' ')
            self.expression = self.expression.replace(' ', '\s+')
            self.mods.regex = True

        self.regex = None
        if self.mods.regex:
            if self.mods.ignore_case:
                self.regex = re.compile(self.expression, re.IGNORECASE)
            else:
                self.regex = re.compile(self.expression)

    def test(self, lines, variables=None, verbose=0):
        if self.mods.multi_lines:
            lines = [' '.join([l.rstrip(ENDLINE_CHARS) for l in lines])]

        expression_var = replace_variables(self.expression, variables)

        if not self.regex and self.mods.ignore_case:
            expression_var = expression_var.upper()

        self.count = None

        # json handling
        if self.mods.json:
            try:
                d = json.loads(lines[0])
                self.json_data = deep_get(d, self.key)

                if expression_var:
                    # An expression is provided: prepare data for further count
                    if type(self.json_data) is list:
                        lines = [json.dumps(x) for x in self.json_data]
                    elif type(self.json_data) is dict:
                        lines = [json.dumps(x) for x in self.json_data.values()]
                    else:
                        lines = [str(self.json_data)]
                else:
                    # No expression provided: we just count the keys
                    if type(self.json_data) in [list, dict]:
                        self.count = len(self.json_data)
                    else:
                        self.count = 1

            except (ValueError, KeyError):
                # No json, or non-existent key: count is 0
                self.json_data = JSON_KEY_NOT_FOUND
                self.count = 0

        # Main count
        if self.count is None:
          self.count = 0
          for l in lines:
            if self.regex:
                if self.mods.count_all:
                    self.count += len(self.regex.findall(l))
                elif self.regex.search(l):
                    self.count += 1
            else:
                if self.mods.ignore_case:
                    l = l.upper()
                if expression_var in l:
                    self.count += l.count(expression_var) if self.mods.count_all else 1

        # Compute status
        if self.expected_count == NOT_ZERO:
            sta = (self.count > 0)
        elif self.mods.less_than:
            sta = (self.count < self.expected_count)
        elif self.mods.more_than:
            sta = (self.count > self.expected_count)
        else:
            sta = (self.count == self.expected_count)

        if self.mods.todo:
            sta = [S_TODO, S_TODO_PASSED][sta]
        if self.mods.allow:
            sta = [S_AF, True][sta]

        self.status = Sta(sta)

        return self.status.or_alias()

    def str_additional_status(self, verbose=False):
        s = ''

        if self.status.is_warned() or verbose:
            s += ' (%s/%s%s)' % (self.count,
                                 MOD_LESS_THAN if self.mods.less_than else MOD_MORE_THAN if self.mods.more_than else '',
                                 self.expected_count)

        return s

    def __repr__(self):
        return '%s%s:%s' % (self.modifiers, self.expected_count if self.expected_count != NOT_ZERO else '', self.expression)


class TestSuite():
    '''
    >>> s = TestSuite()
    >>> s.test(['echo "hello"', '$My test', ':hello'], colorize = False)
    True
    >>> s.tests[0].status.or_alias()
    True

    >>> s2 = TestSuite('r')
    >>> s2.variables.append(("$LAUNCHER", ""))
    >>> s2.variables.append(("$EXTRA", ""))
    >>> s2.test(['echo "hello"', '$ A nice test', ':e.*o'], verbose = 1, colorize = False)   # doctest: +NORMALIZE_WHITESPACE
    echo "hello"
      stdout --> 1 lines
      stderr --> 0 lines
    ok (0) - Exit code is 0 -- echo "hello"
    ok (1/+) - A nice test
    :e.*o
    True

    >>> s2.str_status(colorize = False)
    '==> ok - ok:2 - total:2 tests'

    >>> print(s2.tap())   # doctest: +NORMALIZE_WHITESPACE
    1..2
    ok - Exit code is 0 -- echo "hello"
    ok - A nice test
    '''

    def __init__(self, modifiers = '', cd = None, name = '', timeout = TIMEOUT):
        self.name = name
        self.requires = True
        self.requires_cmd = None
        self.requires_stderr = []
        self.cmds = []
        self.tests = []
        self.stdin = []
        self.stdout = []
        self.test_lines = []
        self.skip = False
        self.status = None
        self.modifiers = modifiers
        self.opt_modifiers = ''
        self.variables = []
        self.status = Sta()
        self.stats = Stats('test')
        self.source = None
        self.cd = cd
        self.use_launcher = True
        self.expected_exit_code = 0
        self.elapsed_time = None
        self.timeout = timeout

    def cmd_variables_cd(self, cmd, verbose, colorize):
        cmd = replace_variables(cmd, self.variables_all)
        if self.cd:
            cmd = 'cd %s ; ' % self.cd + cmd
        if verbose > 0:
            print(color(ANSI.MAGENTA, cmd, colorize))
        return cmd

    def test(self, should_lines, variables=[], verbose=0, colorize=True, only=None):
        name = ''
        current_cmd = ''   # multi-line command
        current_test_lines = [] # currently evaluated output lines
        current_tests = False # tests were evaluated since the last command run
        self.only = only
        self.variables_all = self.variables + variables

        # Iterate over should_lines
        # then use once DIRECTIVE_SCRIPT to flush the last tests
        for l in list(should_lines) + [DIRECTIVE_SCRIPT]:

            l = l.lstrip().rstrip(ENDLINE_CHARS)
            if not l:
                continue

            # Comment
            if l.startswith(TOKEN_COMMENT):
                continue

            # Directive -- Requires
            if l.startswith(DIRECTIVE_REQUIRES):
                self.requires_cmd = l[len(DIRECTIVE_REQUIRES):].strip()

                self.variables_all = self.variables + variables
                requires_cmd = self.cmd_variables_cd(self.requires_cmd, verbose, colorize)
                p = subprocess.Popen(requires_cmd, shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
                self.requires = (p.wait() == 0)
                self.requires_stderr = [l.decode(errors='replace') for l in p.stderr.readlines()]
                if not self.requires:
                    self.skip_set('Condition is not met: %s' % self.requires_cmd, verbose)
                if verbose > 0:
                    print(color(ANSI.CYAN, ''.join(self.requires_stderr), colorize))
                continue

            # Directive -- No launcher
            if l.startswith(DIRECTIVE_NO_LAUNCHER):
                self.use_launcher = False
                if replace_variables(VAR_LAUNCHER, self.variables_all):
                    self.skip_set('%s while %s is given' % (DIRECTIVE_NO_LAUNCHER, VAR_LAUNCHER), verbose)
                continue

            # Directive -- No extra options
            if l.startswith(DIRECTIVE_NO_EXTRA):
                self.variables = [(VAR_EXTRA, '')] + self.variables
                self.variables_all = self.variables + variables
                continue

            # Directive -- Source
            if l.startswith(DIRECTIVE_SOURCE):
                self.source = os.path.join(self.cd if self.cd else '', l[len(DIRECTIVE_SOURCE):].strip())
                continue

            # Directive -- Options
            if l.startswith(DIRECTIVE_OPTIONS):
                opts, unknown = options.parse_known_args(l[len(DIRECTIVE_OPTIONS):].split())
                self.variables = populate_variables(opts.var) + self.variables
                self.variables_all = self.variables + variables
                self.opt_modifiers = ''.join(opts.mod) if opts.mod else ''
                continue

            # Directive -- Exit code
            if l.startswith(DIRECTIVE_EXIT_CODE):
                e = l[len(DIRECTIVE_EXIT_CODE):].strip()
                self.expected_exit_code = NOT_ZERO if e == NOT_ZERO else int(e)
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
                test = TestCase(modifiers + self.opt_modifiers + self.modifiers, expression, name, l)

                if self.skip:
                    self.skip_tests([test])
                    continue

                self.one_test(test, current_test_lines, verbose, colorize)
                self.tests.append(test)
                current_tests = True
                continue


            l = l.strip()

            # The command possibly continues on the next line
            next_cmd_continues = l.endswith(CONTINUATION_CHAR)
            if next_cmd_continues:
                l = l[:-1]

            current_cmd += l

            if next_cmd_continues:
                continue

            # Flush tasks on the previous tests
            if current_tests:
                # Debug the previous tests
                self.debug(self.status, current_cmd, test_lines, verbose, colorize)

                # Empty the buffers
                current_test_lines = []
                current_tests = False

            # If we are at the end (DIRECTIVE_SCRIPT)
            if not l:
                continue

            # Launch the command
            test_lines, exit_test = self.launch([current_cmd], verbose, colorize)
            self.one_test(exit_test, test_lines, verbose, colorize)

            self.cmds.append(current_cmd)
            current_cmd = ''
            current_test_lines += test_lines
            self.test_lines += test_lines

        # end of loop on should_lines

        if verbose > 1:
            print_variables(self.variables_all)

        return self.status.or_alias()


    def launch(self, cmds, verbose, colorize):
        start_time = time.time()

        cmd = ' ; '.join(map(pre_process, cmds))
        cmd = self.cmd_variables_cd(cmd, verbose, colorize)

        f_stdout = tempfile.TemporaryFile()
        f_stderr = tempfile.TemporaryFile()
        p = subprocess.Popen([cmd], shell=True,
                             stdout=f_stdout, stderr=f_stderr,
                             close_fds=True)

        exit_code_message = 'Exit code is %s -- %s' % (self.expected_exit_code, cmd)

        try:
            self.exit_code = p.wait(self.timeout)
            if self.expected_exit_code == NOT_ZERO:
                success = (self.exit_code > 0)
            else:
                success = (self.exit_code == self.expected_exit_code)
            exit_test = ExternalTestCase(exit_code_message, success, str(self.exit_code))
        except subprocess.TimeoutExpired:
            self.exit_code = None
            exit_test = ExternalTestCase(exit_code_message, S_SKIP, 'timeout after %s seconds' % self.timeout)
            p.kill()

        self.tests.append(exit_test)
        self.status += exit_test.status

        if self.elapsed_time is None:
            self.elapsed_time = 0
        self.elapsed_time += time.time() - start_time

        f_stdout.seek(0)
        f_stderr.seek(0)
        self.stdout = [l.decode(errors='replace') for l in f_stdout.readlines()]
        self.stderr = [l.decode(errors='replace') for l in f_stderr.readlines()]
        f_stdout.close()
        f_stderr.close()

        if verbose > 0:
            self.print_stderr(colorize)

        return open(self.source).readlines() if self.source else self.stdout, exit_test



    def one_test(self, test, test_lines, verbose, colorize):
            '''
            Test the TestCase 'test' on 'test_lines',
            taking into account self.only, self.modifiers
            and gathering statuses in self.status and self.stats
            '''
            # Filter
            if self.only:
                if not self.only(test):
                    test.status = S_SKIP
                    return

            # Test the test
            test.test(test_lines, variables=self.variables_all, verbose=verbose-1)
            self.stats.up(test.status)
            self.status += test.status

            if verbose > 0 or test.status.is_warned():
                print(test.str(colorize=colorize, verbose=verbose>0))
                if test.raw:
                    print(test.raw)
                if test.json_data:
                    print(test.key, '-->', color(test.status.color, str(test.json_data), colorize))
                print()

    def print_stderr(self, colorize=True):
        print('  stdout --> %s lines' % len(self.stdout))
        print('  stderr --> %s lines' % len(self.stderr))
        print(color(ANSI.CYAN, ''.join(self.stderr), colorize))

    def skip_set(self, reason, verbose=1):
        if verbose > 0:
            print('Skipping tests: %s' % reason)
        self.skip = True
        self.status += Sta(S_SKIP)

    def skip_tests(self, tests):
        for test in tests:
            test.status = Sta(S_SKIP)
            self.stats.up(test.status)

    def debug(self, status, cmd, test_lines, verbose, colorize):
        if status.is_failed() and verbose <= 0:
            print(color(ANSI.MAGENTA, cmd, colorize))
            self.print_stderr(colorize)

        if status.is_failed() or verbose > 1:
            print(LINE)
            if len(test_lines) <= MAX_DUMP_LINES:
                print(''.join(test_lines), end='')
            else:
                print(''.join(test_lines[:MAX_HALF_DUMP_LINES]), end='')
                print(color(ANSI.MAGENTA, '... %d other lines ...' % (len(test_lines) - 2*MAX_HALF_DUMP_LINES), colorize))
                print(''.join(test_lines[-MAX_HALF_DUMP_LINES:]), end='')

            print(LINE)

    def str_additional_status(self, verbose=False):
        return ''

    def str_status(self, colorize=True):
        return self.stats.str_status(self.status, colorize)

    def xml(self):
        x = ET.Element('testsuite',
                       {'id': self.name,
                        'name': self.name,
                        'cmd': str(self.cmds),
                        'tests': str(self.stats.total()),
                        'failures': str(len(self.stats[False])),
                        'skipped': str(len(self.stats[S_SKIP])),
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

    def __init__(self, files, modifiers = '', timeout = TIMEOUT):
        self.files = files
        self.sets = []
        self.modifiers = modifiers
        self.status = Sta()
        self.stats = Stats('file')
        self.stats_tests = Stats('test')
        self.timeout = timeout

    def __len__(self):
        return len(self.files)

    def test(self, variables=None, cd=None, cd_same=False, output=None, verbose=0, only=None):
        self.status = Sta()

        try:
          for f in self.files:
            if verbose > 0:
                print(f)
            cd_f = os.path.dirname(f) if cd_same else cd
            s = TestSuite(self.modifiers, cd_f, name = f, timeout = self.timeout)
            self.sets.append(s)
            s.test(open(f), variables, verbose - 1, only=only)
            self.stats.up(s.status, f)
            self.status += s.status
            self.stats_tests += s.stats

            filename_without_ext = os.path.splitext(f)[0]

            if output and OUT_LOG in output:
                write_to_file(filename_without_ext + OUT_LOG, ''.join(s.test_lines), verbose > 0)

            if output and OUT_TAP in output:
                write_to_file(filename_without_ext + OUT_TAP, s.tap(), verbose > 0)

            if verbose > 0 or s.status.is_warned():
                print(s.str_status(), end=' ')

            if not verbose or verbose > 1 or s.status.is_warned():
                print(f, end='')

            if verbose > 0:
                print('')

            if verbose > 0 and s.elapsed_time:
                    if s.elapsed_time >= SHOW_ELAPSED_TIME_ABOVE:
                        print(s.str_elapsed_time())

            print('')

        except KeyboardInterrupt:
            print('==== interrupted ====\n')

        if output and OUT_XML in output:
            self.xml().write(OUT_XML)

        print()
        print('Summary', end=' ')
        print(self.stats.str_status(self.status))
        print('Summary', end=' ')
        print(self.stats_tests.str_status(self.status))
        print()

        for sta in self.stats.keys():
            if sta.name == S_OK:
                continue
            print('files with %s:' % sta)
            for f in self.stats[sta]:
                print('  ' + f)

        return self.status.or_alias()

    def xml(self):
        x = ET.Element('testsuites',
                       {'id': 'Test at %s' % datetime.datetime.now().isoformat(),
                        'name': 'tested by should',
                        'tests': str(self.stats_tests.total()),
                        'failures': str(len(self.stats_tests[False]) if False in self.stats_tests else 0),
                       })

        for s in self.sets:
            x.append(s.xml())

        return ET.ElementTree(x)

    def write_retry(self, argv, argv_remove, verbose=1):
        '''
        If there were tests in WARN_STATUS, write the RETRY_FAILED/RETRY_WARNED files
        with, non-file arguments and WARN_STATUS files.
        '''

        # cmd = [sys.executable, sys.argv[0]]

        files_failed = []
        files_warned = []

        for status, ff in self.stats:
            if status.is_failed():
                files_failed += ff
            if status.is_warned():
                files_warned += ff

        if not files_warned:
            return

        args = []
        for arg in argv:
            if arg not in argv_remove:
                args.append(arg)

        with open(RETRY_FAILED, 'w') as f:
            f.write('\n'.join(args + files_failed) + '\n')
        with open(RETRY_WARNED, 'w') as f:
            f.write('\n'.join(args + files_warned) + '\n')

        if verbose > 0:
            cmd = '%s %s' % (sys.argv[0], RETRY_FAILED_FLAG)
            if len(files_warned) > len(files_failed):
                cmd += ' or %s %s' % (sys.argv[0], RETRY_WARNED_FLAG)
            print('\n' + cmd + ' will relaunch these tests.')

def read_retry(f):
    try:
        return [l.rstrip() for l in open(f).readlines()]
    except:
        return []


if __name__ == '__main__':
    argv = (['@' + DEFAULT_CFG] + sys.argv[1:]) if os.path.exists(DEFAULT_CFG) else sys.argv[1:]

    if RETRY_FAILED_FLAG in argv or RETRY_WARNED_FLAG in argv:
        retry = []
        if RETRY_FAILED_FLAG in argv:
            retry = read_retry(RETRY_FAILED)
        if RETRY_WARNED_FLAG in argv:
            retry = read_retry(RETRY_WARNED)
        argv += retry
        if retry:
            print(color(ANSI.BLUE, "Retrying previous failed or warned tests"))
        else:
            print(color(ANSI.RED, "Nothing to retry"))
            sys.exit(2)

    args = parser.parse_args(argv)
    variables = populate_variables(args.var)
    variables.append((VAR_LAUNCHER, args.launcher))
    variables.append((VAR_EXTRA, args.extra))

    if args.verbose>0:
        print_variables(variables)

    if args.shuffle:
        print("Shuffling test files")
        random.shuffle(args.file)

    # Filters
    only = lambda test: (
        ((MOD_TODO in test.modifiers) <= (not args.no_f)) and
        ((MOD_TODO in test.modifiers) >= args.only_f) and
        ((MOD_ALLOW in test.modifiers) <= (not args.no_a)) and
        ((MOD_ALLOW in test.modifiers) >= args.only_a)
        )

    if args.fail_a:
        args.mod = (args.mod if args.mod else []) + ['A']

    # Launch tests
    fs = FileSet(args.file, timeout = args.timeout, modifiers=''.join(args.mod if args.mod else []))
    fs.test(variables = variables, cd = args.cd, cd_same = args.cd_same, output = args.output, verbose = args.verbose, only = only)

    if len(fs) > 1:
        retry = fs.write_retry(sys.argv[1:], args.file, verbose = args.verbose)

    sys.exit(1 if fs.status.is_failed() else 0)


