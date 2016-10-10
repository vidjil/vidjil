#!/bin/sh
python server/web2py/web2py.py -S vidjil -M -R applications/vidjil/scripts/vidjil-algo-version.py | grep -E "(# version|# git)"


