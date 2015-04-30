#!/bin/bash

options=$1
filename=$(ssh vidjil-bak@rbx.vidjil.org "cd /home/vidjil/server; sh ./backup.sh ${options} ~" | tail -1)
scp vidjil-bak@rbx.vidjil.org:${filename}.zip /mnt/data/backup/vidjil/
ssh vidjil-bak@rbx.vidjil.org "rm -f ${filename}.zip"
