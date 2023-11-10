#!/bin/bash
echo -e "\n\e[34m=========================\e[0m"
echo -e "\e[34m=== Start service workers\e[0m"
echo -e "\e[34m=== `date +'%Y/%m/%d; %H:%M'`\e[0m"; echo

. $(dirname $0)/tools.sh
user=$(get_user_of_results)
gosu $user python /usr/share/vidjil/server/web2py/web2py.py -K vidjil,vidjil,vidjil
