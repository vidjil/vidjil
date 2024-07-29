#!/bin/bash
echo "${BUILD_ENV}"
if [ "${BUILD_ENV}" = "TEST" ]
then
    ln -sf /etc/vidjil/conf_http.js /usr/share/vidjil/browser/js/conf.js
    ln -sf /etc/vidjil/nginx_vidjil_http /etc/nginx/conf.d/vidjil.conf
else
    ln -sf /etc/vidjil/conf.js /usr/share/vidjil/browser/js/conf.js
    ln -sf /etc/vidjil/nginx_vidjil /etc/nginx/conf.d/vidjil.conf
fi
