#!/bin/sh

f1=$1.formatted
f2=$2.formatted

python format_json.py $1 > $f1
python format_json.py $2 > $f2

shift
shift
diff $f1 $f2 $@


