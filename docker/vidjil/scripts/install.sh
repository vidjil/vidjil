#!/bin/bash
echo "${BUILD_ENV}"
if [ "${BUILD_ENV}" = "TEST"  ]; then
    cp -avr /opt/vidjil_conf/defs_http.py /etc/vidjil/defs.py
    cp -avr /opt/vidjil_conf/conf_http.js /etc/vidjil/conf.js
    cp -avr /opt/vidjil_conf/web2py_http /etc/nginx/sites-enabled/web2py
else
    cp -avr /opt/vidjil_conf/defs.py /etc/vidjil/defs.py
    cp -avr /opt/vidjil_conf/conf.js /etc/vidjil/conf.js
    cp -avr /opt/vidjil_conf/web2py /etc/nginx/sites-enabled/web2py
fi;

