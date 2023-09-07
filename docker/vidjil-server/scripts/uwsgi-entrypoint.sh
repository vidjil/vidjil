#!/bin/bash
echo -e "\n\e[34m=======================\e[0m"
echo -e "\e[34m=== Start service uwsgi\e[0m"
echo -e "\e[34m=== `date +'%Y/%m/%d; %H:%M'`\e[0m"; echo


. $(dirname $0)/tools.sh
user=$(get_user_of_results)

echo "==== Setup apps of py4web ==="
cd /usr/share/vidjil/server/py4web/
py4web setup apps --yes # Yes to all, so useless apps are "installed"
# List of installed apps : _default, _minimal, _dahsboard, _documentation, _scaffold, showcase
rm -r  apps/_default  apps/_minimal apps/_scaffold apps/showcase # clean useless default apps


echo "==== Setup password"
cd /usr/share/vidjil/server/py4web/apps/
/usr/local/bin/gosu $user py4web set_password --password "$PY4WEB_ADMIN_PASSWORD"
ls /usr/share/vidjil/server/py4web/apps/


echo "==== Start uwsgi script ==="
uwsgi /etc/uwsgi/sites/uwsgi.ini