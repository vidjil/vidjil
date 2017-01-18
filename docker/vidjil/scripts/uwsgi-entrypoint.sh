#!/bin/bash
touch /var/vidjil/vidjil.log
touch /var/vidjil/vidjil-debug.log
chown -R www-data:www-data /var/vidjil/vidjil*
chown -R www-data:www-data /mnt/result
chown -R www-data:www-data /mnt/upload
chown -R www-data:www-data /usr/share/vidjil/server/web2py/applications/vidjil/databases
/usr/local/bin/gosu www-data /usr/bin/uwsgi --ini /etc/uwsgi/apps-enabled/web2py.ini
