#!/bin/sh

if [ $# -eq 0 -o "$1" == "-h" -o "$1" == "--help" ]; then
    echo "Usage: $0 <python script>

    Launches the python script (just indicate the basename, the script
    must be put in the script directory)"
    exit 1
fi

SCRIPT_DIR=$(dirname $0)
script_name=$1
shift
python $SCRIPT_DIR/../../../web2py.py -S vidjil -M -R "applications/vidjil/scripts/$script_name" -A $*
