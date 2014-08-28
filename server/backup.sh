#!/bin/sh

now=$(date +"%Y_%m_%d") 
if [ "$1" = "-c" ]; then
        filename="backup_"$now
        zip -r $filename web2py/applications/vidjil/uploads/ web2py/applications/vidjil/databases/
else
        filename="backup_essentials_"$now
        zip -r $filename web2py/applications/vidjil/databases/ web2py/applications/vidjil/uploads/data_file* web2py/applications/vidjil/uploads/fused_file*
fi

echo $filename
