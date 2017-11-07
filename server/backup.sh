#!/bin/sh

COMPLETE=0
INCREMENTAL=0
DIR=

if [ $# -ge 1 -a "$1" = "-h" ]; then
    echo "$0: [-c] [-i] [path]

-c:   Backup everything
-i:   Incremental backup, since the first of the month
path: Where to save the file" >&2
    exit 1
fi

if [ $# -ge 1 -a "$1" = "-i" ]; then
    INCREMENTAL=1
    shift
fi

if [ $# -ge 1 -a "$1" = "-c" ]; then
    COMPLETE=1
    shift
fi

if [ $# -ge 1 ]; then
    DIR="$1/"
fi

now=$(date +"%Y-%m-%d_%H:%M:%S")
vidjil_path=web2py/applications/vidjil
db_backup_file=/tmp/db-backup-$now.csv

defs_py=$vidjil_path/modules/defs.py

if [ ! -f "$defs_py" ]; then
    echo "$defs_py doesn't exist. Is the Vidjil server fully installed?" >&2
    exit 2
fi

DIR_SEQUENCES=$(sed -rn "s/^DIR_SEQUENCES.*['\"](.*)['\"].*$/\1/p" $defs_py)
DIR_RESULTS=$(sed -rn "s/^DIR_RESULTS.*['\"](.*)['\"].*$/\1/p" $defs_py)

python web2py/web2py.py -S vidjil -M -R "applications/vidjil/scripts/backup-db.py" -A "$db_backup_file"

if [ $COMPLETE -eq 1 ]; then
        filename="${DIR}backup_"$now
        zip -r $filename web2py/applications/vidjil/databases/  "$DIR_SEQUENCES" "$DIR_RESULTS" $db_backup_file
else
    if [ $INCREMENTAL -eq 1 ]; then
    else
        filename="${DIR}backup_essentials_"$now
        zip -r $filename web2py/applications/vidjil/databases/  "$DIR_RESULTS" $db_backup_file
    fi
fi
rm -f "$db_backup_file"
ls -lh $filename
echo $filename
