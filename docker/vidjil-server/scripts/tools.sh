#!/bin/bash
get_user_of_results() {
    if [ -d /mnt/result/results ]; then
        user=$(stat -c '%u' /mnt/result/results)
    else
        user=www-data
    fi
    echo $user
}

sed -i "s/MYSQL_PASSWORD/${MYSQL_PASSWORD}/g" /usr/share/vidjil/server/web2py/applications/vidjil/modules/defs.py
