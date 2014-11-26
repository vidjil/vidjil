#!/bin/sh

COMPLETE=0
DIR=

if [ $# -ge 1 -a "$1" = "-h" ]; then
    echo "$0: [-c] [path]

-c:   Backup everything
path: Where to save the file" >&2
    exit 1
fi

if [ $# -ge 1 -a "$1" = "-c" ]; then
    COMPLETE=1
    shift
fi

if [ $# -ge 1 ]; then
    DIR="$1/"
fi

now=$(date +"%Y-%m-%d_%H:%M:%S") 
if [ $COMPLETE -eq 1 ]; then
        filename="${DIR}backup_"$now
        zip -r $filename web2py/applications/vidjil/databases/  /mnt/result/results/  /mnt/upload/uploads/
else
        filename="${DIR}backup_essentials_"$now
        zip -r $filename web2py/applications/vidjil/databases/  /mnt/result/results/
fi

echo $filename
