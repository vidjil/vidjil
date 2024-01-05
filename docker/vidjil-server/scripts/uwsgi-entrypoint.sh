#!/bin/bash
echo -e "\n\e[34m=======================\e[0m"
echo -e "\e[34m=== Start service uwsgi\e[0m"
echo -e "\e[34m=== `date +'%Y/%m/%d %H:%M:%S'`\e[0m"; echo

mkdir -p /mnt/backup/ /mnt/data/ /mnt/result/ /mnt/upload/

. $(dirname $0)/tools.sh
user=$(get_user_of_results)

echo "==== Setup password"
cd /usr/share/vidjil/server/py4web/apps/
gosu $user py4web set_password --password "$PY4WEB_ADMIN_PASSWORD"
ls /usr/share/vidjil/server/py4web/apps/

echo "==== Change owner of vidjil directories: $user"
echo "     .../database"
chown $user:$user -R /usr/share/vidjil/server/py4web/apps/vidjil/databases/

if [[ -v UWSGI_POOL ]]; then
    echo "==== Change number of threads: '$UWSGI_POOL'"
    sed -i "s/processes = 6/processes = $UWSGI_POOL/g" /etc/uwsgi/sites/uwsgi.ini
fi


echo "==== Start healthcheck ==="
bash /healthchecks/healthcheck_uwsgi.bash


echo -e "\n======================="
echo -e "=== Start uwsgi === `date +'%Y/%m/%d %H:%M:%S`"; echo

gosu $user uwsgi /etc/uwsgi/sites/uwsgi.ini