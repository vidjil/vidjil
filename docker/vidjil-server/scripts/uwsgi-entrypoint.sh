#!/bin/bash
echo -e "\n\e[34m===========================\e[0m"
echo -e "\e[34m=== Start service uwsgi ===\e[0m"
echo -e "\e[34m=== `date +'%Y/%m/%d %H:%M:%S'` ===\e[0m"
echo -e "\e[34m===========================\e[0m\n"

mkdir -p /mnt/backup/ /mnt/data/ /mnt/result/ /mnt/upload/

user=33
echo "user : `id -nu $user` (id $user)"

echo "==== Setup password"
cd /usr/share/vidjil/server/py4web/apps/
gosu $user py4web set_password --password "$PY4WEB_ADMIN_PASSWORD"

echo "==== Change owner of vidjil directories: $user"
echo "     .../database"

if [[ "$CHANGE_OWNER" == "true" ]]; then
    echo "==== Change owner of directories to owner '`id -nu $user` (id $user)': '$CHANGE_OWNER'"
    echo "     - databases"
    current_user=$(stat -c '%u' /usr/share/vidjil/server/py4web/apps/vidjil/databases)
    if [ $current_user -ne $user ]; then
      chown $user:$user -R /usr/share/vidjil/server/py4web/apps/vidjil/databases
    fi
    echo "     - uploads"
    current_user=$(stat -c '%u' /mnt/upload/)
    if [ $current_user -ne $user ]; then
      chown $user:$user -R /mnt/upload/
    fi
    echo "     - results"
    current_user=$(stat -c '%u' /mnt/result)
    if [ $current_user -ne $user ]; then
      chown $user:$user -R /mnt/result
    fi
fi

if [[ -v UWSGI_POOL ]]; then
    echo "==== Change number of threads: '$UWSGI_POOL'"
    sed -i "s/processes = 6/processes = $UWSGI_POOL/g" /etc/uwsgi/sites/uwsgi.ini
fi

echo
gosu $user uwsgi /etc/uwsgi/sites/uwsgi.ini
