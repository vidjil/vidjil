#!/bin/bash
chown -R www-data:www-data /mnt/results
chown -R www-data:www-data /mnt/uploads
chown -R www-data:www-data /usr/share/vidjil/server/web2py/applications/vidjil/databases
/usr/local/bin/gosu www-data /usr/bin/uwsgi --ini /etc/uwsgi/apps-enabled/web2py.ini
