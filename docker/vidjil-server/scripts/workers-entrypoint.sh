#!/bin/bash
. $(dirname $0)/tools.sh
user=$(get_user_of_results)
/usr/local/bin/gosu $user python /usr/share/vidjil/server/web2py/web2py.py -K vidjil,vidjil,vidjil
