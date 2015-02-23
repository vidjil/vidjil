import json
import sys
from collections import OrderedDict

f = sys.stdin
if len(sys.argv) > 1:
    f = open(sys.argv[1])
s = f.read()
print json.dumps(OrderedDict(json.loads(s, object_pairs_hook=OrderedDict))).replace('\n', ' ')


