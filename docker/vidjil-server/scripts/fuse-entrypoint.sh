#!/bin/bash
echo -e "\e[34m======================\e[0m"
echo -e "\e[34m=== Start service fuse\e[0m"
echo -e "\e[34m=== `date +'%Y/%m/%d; %H:%M'`\e[0m"
echo

user=33
echo "user : `id -nu $user` (id $user)"

cd /usr/share/vidjil/server/py4web/apps/vidjil
gosu $user python3 fuse_server.py
