#!/bin/bash

# This script is to be launched from an external backup server

# Local backup directory
DIR_BACKUP=/mnt/data/backup/vidjil/

# Remote server
VIDJIL_SERVER=vidjil-bak@rbx.vidjil.org

options=$1
filename=$(ssh ${VIDJIL_SERVER} "cd /home/vidjil/server; sh ./backup.sh ${options} ~" | tail -1)

scp ${VIDJIL_SERVER}:${filename}.zip ${DIR_BACKUP}
ssh ${VIDJIL_SERVER} "rm -f ${filename}.zip"
