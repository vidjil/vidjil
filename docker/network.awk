#!/bin/awk -f

s{
    printf "        "
    print "network_mode: bridge"
    s=0
} /(nginx|fuse|uwsgi|workers|mysql):$/{s=1}1
