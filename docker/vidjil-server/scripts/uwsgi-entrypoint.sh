#!/bin/bash
. $(dirname $0)/tools.sh
user=$(get_user_of_results)

echo "==== Setup apps of py4web ==="
cd /usr/share/vidjil/server/py4web/apps
py4web setup apps --yes # Yes to all, so useless apps are "installed"
# List of installed apps : _default, _minimal, _dahsboard, _documentation, _scaffold, showcase
rm -r  _default  _minimal _scaffold showcase # clean useless default apps


echo "==== Setup password"
cd /usr/share/vidjil/server/py4web
/usr/local/bin/gosu $user py4web set_password --password "$PY4WEB_ADMIN_PASSWORD"
ls /usr/share/vidjil/server/py4web/apps/


echo "==== Start uwsgi script ==="
uwsgi /etc/uwsgi/sites/uwsgi.ini