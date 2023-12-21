#!/bin/bash
echo -e "\n\e[34m======================\e[0m"
echo -e "\e[34m=== Start service fuse\e[0m"
echo -e "\e[34m=== `date +'%Y/%m/%d; %H:%M'`\e[0m"; echo


. $(dirname $0)/tools.sh
user=$(get_user_of_results)

cd /usr/share/vidjil/server
gosu $user python fuse_server.py
