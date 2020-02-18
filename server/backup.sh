#!/bin/sh

COMPLETE=0
INCREMENTAL=0
DIR=
DATABASE=
BACKUP_DAY=
YESTERDAY=

usage() {
    echo "$0: [-c|-i|-d|-y] dbname [path]

-c:   Backup everything
-i:   Incremental backup, since the first of the month
-d:   Backup of the current day
-y:   Backup since yesterday
path: Where to save the file" >&2
    exit 1
}

if [ $# -ge 1 -a "$1" = "-h" ]; then
    usage
fi

if [ $# -ge 1 -a "$1" = "-i" ]; then
    INCREMENTAL=1
    BACKUP_DAY=$(date --date="$(date +%Y-%m-01)" +"%Y-%m-%d")
    shift
fi

if [ $# -ge 1 -a "$1" = "-c" ]; then
    COMPLETE=1
    shift
fi

if [ $# -ge 1 -a "$1" = "-d" ]; then
    BACKUP_DAY=$(date +%Y-%m-%d)
    INCREMENTAL=1
    shift
fi

if [ $# -ge 1 -a "$1" = "-y" ]; then
    BACKUP_DAY=$(date --date=yesterday +%Y-%m-%d)
    INCREMENTAL=1
    shift
fi

if [ $# -eq 0 ]; then
    usage
fi

DATABASE="$1"
shift

if [ $# -ge 1 ]; then
    DIR="$1/"
fi

now=$(date +"%Y-%m-%d_%H:%M:%S")

vidjil_path=web2py/applications/vidjil
db_backup_file=/tmp/db-backup-$now.csv
sql_backup_file=/tmp/db-backup-$now.sql

defs_py=$vidjil_path/modules/defs.py

if [ ! -f "$defs_py" ]; then
    echo "$defs_py doesn't exist. Is the Vidjil server fully installed?" >&2
    exit 2
fi

DIR_SEQUENCES=$(sed -rn "s/^DIR_SEQUENCES.*['\"](.*)['\"].*$/\1/p" $defs_py)
DIR_RESULTS=$(sed -rn "s/^DIR_RESULTS.*['\"](.*)['\"].*$/\1/p" $defs_py)

python web2py/web2py.py -S vidjil -M -R "applications/vidjil/scripts/backup-db.py" -A "$db_backup_file"
mysqldump  --no-create-info --complete-insert "$DATABASE" > $sql_backup_file

if [ $COMPLETE -eq 1 ]; then
        filename_raw="${DIR}backup_"$now
        filename=$filename_raw.zip
        zip -r $filename_raw web2py/applications/vidjil/databases/  "$DIR_SEQUENCES" "$DIR_RESULTS" $db_backup_file $sql_backup_file
else
    if [ $INCREMENTAL -eq 1 ]; then
        filename_raw="${DIR}backup_incremental_${BACKUP_DAY}__${now}.tar"
        filename=$filename_raw.gz
	tar cvf $filename_raw --force-local web2py/applications/vidjil/databases/ $db_backup_file $sql_backup_file
	tar rvf $filename_raw --force-local --after-date "$BACKUP_DAY" "$DIR_RESULTS" 2>&1 | grep -v "file is unchanged"
	gzip $filename_raw
    else
        filename_raw="${DIR}backup_essentials_"$now
        filename=$filename_raw.zip
        zip -r $filename_raw web2py/applications/vidjil/databases/  "$DIR_RESULTS" $db_backup_file $sql_backup_file
    fi
fi
rm -f "$sql_backup_file"
rm -f "$db_backup_file"
ls -lh $filename
echo $filename
