#!/bin/bash
echo -e "\e[34m======================\e[0m"
echo -e "\e[34m=== Start service fuse\e[0m"
echo -e "\e[34m=== `date +'%Y/%m/%d; %H:%M'`\e[0m"; echo

. $(dirname $0)/tools.sh
user=$(get_user_of_results)

sed -i "s/web2py\/applications\/vidjil\/modules/py4web\/apps\/vidjil/g" /usr/share/vidjil/server/fuse_server.py
sed -i "s/\/usr\/share\/vidjil\/server//g" /usr/share/vidjil/server/fuse_server.py
echo -e "Whoami : `whoami`; User gosu $user `/usr/local/bin/gosu $user whoami`"
pwd


cd /usr/share/vidjil/server
/usr/local/bin/gosu $user python fuse_server.py
