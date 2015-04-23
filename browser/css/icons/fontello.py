'''
Sort and split a fontello config.json file according to 'src'
python fontello.py config.json
'''

import json
import copy
import sys

def dump(j, out):
    print "  ==> %-50s   %3d glyphs" % (out, len(j['glyphs']))
    json.dump(j, open(out, 'w'), indent=2)



name = sys.argv[1]
basename = name.replace('.json', '')

j = json.load(open(name))
glyphs = j['glyphs']


srcs = set(icon['src'] for icon in glyphs)


family_code = [ 0xE900, 0xEA00, 0xEB00, 0xEC00 ]
family = 0

for src in srcs:

    code = family_code[family]
    family += 1

    jj = copy.deepcopy(j)
    jj['glyphs'] = []

    for icon in glyphs:

        if not icon['src'] == src:
            continue

        code += 1
        icon['code'] = code
        jj['glyphs'].append(icon)

    dump(jj, '%s-%s.json' % (basename, src))

dump(j, '%s-sorted.json' % basename)
