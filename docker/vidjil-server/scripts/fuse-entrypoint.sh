#!/bin/bash
echo -e "\n\e[34m======================\e[0m"
echo -e "\e[34m=== Start service fuse\e[0m"
echo -e "\e[34m=== `date +'%Y/%m/%d; %H:%M'`\e[0m\n"

user=33
echo "user : `id -nu $user` (id $user)"

gosu $user bash -c 'cd /usr/share/vidjil/server/py4web/apps/vidjil && source /usr/share/vidjil/venv/bin/activate && \
    python3 fuse_server.py'
