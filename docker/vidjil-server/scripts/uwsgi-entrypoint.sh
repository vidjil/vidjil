#!/bin/bash
touch /var/vidjil/vidjil.log
touch /var/vidjil/vidjil-debug.log
if [ -d /mnt/result/results ]; then
    user=$(stat -c '%u' /mnt/result/results)
else
    user=www-data
fi
chown -R $user /var/vidjil/vidjil*
chown -R $user /usr/share/vidjil/server/web2py/applications/vidjil/databases
/usr/local/bin/gosu $user /usr/bin/uwsgi --ini /etc/uwsgi/apps-enabled/web2py.ini
