#!/bin/bash
spawn-fcgi -u www-data -s /var/run/fcgiwrap.socket /usr/sbin/fcgiwrap
nginx -g 'daemon off;'
