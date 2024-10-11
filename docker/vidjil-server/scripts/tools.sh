#!/bin/bash
get_user_of_results() {
    if [ -d /mnt/result/results ]; then
        user=$(stat -c '%u' /mnt/result/results)
    else
        user=www-data
    fi
    echo $user
}


sed -i "s/MYSQL_PASSWORD/${MYSQL_PASSWORD}/g" /usr/share/vidjil/server/py4web/apps/vidjil/defs.py
sed -i "s/smtp_user/${smtp_user}/g" /usr/share/vidjil/server/py4web/apps/vidjil/defs.py
sed -i "s/maildomain/${maildomain}/g" /usr/share/vidjil/server/py4web/apps/vidjil/defs.py
