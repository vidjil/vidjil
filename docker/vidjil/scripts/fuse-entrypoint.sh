#!/bin/bash

cd /usr/share/vidjil/server
/usr/local/bin/gosu www-data python fuse_server.py
