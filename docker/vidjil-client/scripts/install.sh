#!/bin/bash
echo "${BUILD_ENV}"
if [ "${BUILD_ENV}" = "TEST"  ]; then
    cp -avr /opt/vidjil_conf/conf_http.js /etc/vidjil/conf.js
    cp -avr /opt/vidjil_conf/web2py_http /etc/nginx/conf.d/web2py.conf
else
    cp -avr /opt/vidjil_conf/conf.js /etc/vidjil/conf.js
    cp -avr /opt/vidjil_conf/web2py /etc/nginx/conf.d/web2py.conf
fi;

