from __future__ import print_function
import json
import sys

import argparse

parser = argparse.ArgumentParser(description = 'Format a .json file')
parser.add_argument('--unsorted', '-u', action='store_true', help='do not sort the file (%(default)s)')
parser.add_argument('--one-line', '-1', action='store_true', help='one line output (%(default)d)')
parser.add_argument('file', nargs='?', type=argparse.FileType('r'), default=sys.stdin, help='.json file')

args = parser.parse_args()
json_data = args.file.read()

print(json.dumps(json.loads(json_data),
                 sort_keys=not args.unsorted,
                 indent=None if args.one_line else 2))


