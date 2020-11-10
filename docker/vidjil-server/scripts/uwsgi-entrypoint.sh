#!/bin/bash
. $(dirname $0)/tools.sh
touch /var/vidjil/vidjil.log
touch /var/vidjil/vidjil-debug.log
user=$(get_user_of_results)
chown -R $user /var/vidjil/vidjil*
chown -R $user /usr/share/vidjil/server/web2py/applications/vidjil/databases

if [[ -n "$WEB2PY_ADMIN_PASSWORD" ]]; then
    cd /usr/share/vidjil/server/web2py
    python -c "from gluon.main import save_password; save_password('${WEB2PY_ADMIN_PASSWORD}', 443)"
fi

if [ "$1" == "--ci" ]; then
    python /usr/share/vidjil/tools/fuse.py --output /mnt/result/results/fused.vidjil /usr/share/vidjil/doc/analysis-example.vidjil /usr/share/vidjil/doc/analysis-example.vidjil /usr/share/vidjil/doc/analysis-example.vidjil
fi

/usr/local/bin/gosu $user /usr/bin/uwsgi --ini /etc/uwsgi/apps-enabled/web2py.ini
