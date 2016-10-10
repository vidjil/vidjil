#!/bin/bash
# sed cannot redirect output to the input file so rename the file and sed into the final desired name
mv /etc/vidjil/conf.js /etc/vidjil/tmp
sed s/#{my_url}/$UWSGI_PORT_433_TCP_ADDR/g /etc/vidjil/tmp > /etc/vidjil/conf.js
rm /etc/vidjil/tmp
ln -sf /etc/vidjil/conf.js /usr/share/vidjil/browser/js/conf.js
nginx -g "daemon off;"
