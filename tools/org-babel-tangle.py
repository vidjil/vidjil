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
    file = open(filename, "w")
    file.write(content)
    file.close()
                
def extract_tangle(content, names=None):
    r'''
    Extract a tangle from an .org file

    >>> extract_tangle('\n#+BEGIN_SRC sh :tangle ex1 :var ex=2\necho $ex\n#+END_SRC')
    [{'content': 'echo $ex', 'filename': 'ex1'}]
    >>> extract_tangle('\n#+BEGIN_SRC sh :tangle ex2 :var ex=2\necho $ex\n#+END_SRC', ['ex2'])
    [{'content': 'echo $ex', 'filename': 'ex2'}]
    '''
    if names == None:
        names = ['[^ \t\n]+']
    
    tangles = []
    for name in names:
        regex = '\n\#\+BEGIN_SRC[^\n]*:tangle ('+name+')[^\n]*\n(.*?)\n#\+END_SRC'
        compiled_regex = re.compile(regex, re.DOTALL)
        results = compiled_regex.findall(content)

        for result in results:
            current_tangle = {'filename': result[0],
                              'content': result[1]}
            tangles.append(current_tangle)
    return tangles

def extract_tangle_and_output(content, dir, names=None):
    tangles = extract_tangle(content, names)
    for result in tangles:
        export_tangle(dir + os.sep + result['filename'],
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
