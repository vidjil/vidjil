#!/bin/sh

python ../../../web2py.py -S vidjil -M -R applications/vidjil/scripts//db-stats.py 2> /dev/null

echo -n "=== Server health"
# /etc/update-motd.d/50-landscape-sysinfo
/etc/update-motd.d/60-df
/etc/update-motd.d/90-updates-available
/etc/update-motd.d/98-reboot-required 


