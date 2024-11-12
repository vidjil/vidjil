#!/bin/bash
echo "${BUILD_ENV}"
if [ "${BUILD_ENV}" = "TEST" ]
then
    ln -sf /etc/vidjil/conf_http.js /usr/share/vidjil/browser/js/conf.js
    ln -sf /etc/vidjil/nginx_web2py_http /etc/nginx/conf.d/web2py.conf
else
    ln -sf /etc/vidjil/conf.js /usr/share/vidjil/browser/js/conf.js
    ln -sf /etc/vidjil/nginx_web2py /etc/nginx/conf.d/web2py.conf
fi
