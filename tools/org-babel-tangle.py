import argparse
import re
import os
import sys

parser = argparse.ArgumentParser(description = 'Simulate org-babel-tangle emacs function')
parser.add_argument('--all', '-a', action='store_true', help='Extract all the tangle org babel code')
parser.add_argument('--extract', '-e', default=[], action='append', help='Extract the org-babel code whose :tangle value is provided by this option')
parser.add_argument('--directory', '-d', default='.', help = 'Directory where the output files are stored (default is %(default)s). The directory must exist.')
parser.add_argument('--test', '-t', action='store_true', help='Launch self-tests.')
parser.add_argument('file', nargs='?', type=argparse.FileType('r'), default=sys.stdin, help='.org file')

args = parser.parse_args()

def export_tangle(filename, content):
    f = open(filename, "w")
    f.write(content)
    f.close()


REGEX_TANGLE_ORG = '\n\#\+BEGIN_SRC[^\n]*:tangle (%s)[^\n]*\n(.*?)\n#\+END_SRC'
REGEX_TANGLE_MD  = '\n<!-- tangle: (%s)[^\n]*\n```[^\n]*\n(.*?)\n```'

REGEX = REGEX_TANGLE_MD

def extract_tangle(content, names=None, regex_template = REGEX):
    r'''
    Extract a tangle from an .org file

    >>> extract_tangle('\n#+BEGIN_SRC sh :tangle ex1 :var ex=2\necho $ex\n#+END_SRC', regex_template=REGEX_TANGLE_ORG)
    [{'content': 'echo $ex', 'filename': 'ex1'}]
    >>> extract_tangle('\n#+BEGIN_SRC sh :tangle ex2 :var ex=2\necho $ex\n#+END_SRC', ['ex2'], regex_template=REGEX_TANGLE_ORG)
    [{'content': 'echo $ex', 'filename': 'ex2'}]
    >>> extract_tangle('foo \n<!-- tangle: hello --> \n``` console \nworld\n``` \n bar', ['hello'])
    [{'content': 'world', 'filename': 'hello'}]
    '''
    if names == None:
        names = ['[^ \t\n]+']
    
    tangles = []
    for name in names:
        regex = regex_template % name
        compiled_regex = re.compile(regex, re.DOTALL)
        results = compiled_regex.findall(content)

        for result in results:
            current_tangle = {'filename': result[0],
                              'content': result[1]}
            tangles.append(current_tangle)
    return tangles

def extract_tangle_and_output(content, dirname, names=None):
    tangles = extract_tangle(content, names)
    for result in tangles:
        export_tangle(dirname + os.sep + result['filename'],
                      result['content'])

if args.test:
    import doctest
    doctest.testmod(verbose = True)
    sys.exit(0)

content = args.file.read()

if args.all:
    extract_tangle_and_output(content, args.directory)
else:
    extract_tangle_and_output(content, args.directory, args.extract)
