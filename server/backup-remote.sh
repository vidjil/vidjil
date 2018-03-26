#!/bin/bash

# This script is to be launched from an external backup server

# Local backup directory
DIR_BACKUP=/mnt/data/backup/vidjil/

# Remote server
ARCHIVE_DIR=/mnt/data/tmp

options=$1
filename=$(ssh ${VIDJIL_SERVER} "cd /home/vidjil/server; . /home/vidjil/virtualenv/bin/activate; sh ./backup.sh ${options} ${ARCHIVE_DIR}" | tail -1)
scp ${VIDJIL_SERVER}:${filename} ${DIR_BACKUP}

ssh ${VIDJIL_SERVER} "rm -f ${filename}"
