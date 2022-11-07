#!/bin/bash
. $(dirname $0)/tools.sh
user=$(get_user_of_results)

cd /usr/share/vidjil/server
/usr/local/bin/gosu $user python fuse_server.py
