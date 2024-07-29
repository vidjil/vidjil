#!/bin/bash
echo "${BUILD_ENV}"
if [ "${BUILD_ENV}" = "TEST" ]; then
    ln -s /etc/vidjil/conf_http.js /usr/share/vidjil/browser/js/conf.js
    ln -s /etc/vidjil/nginx_vidjil_http.conf /etc/nginx/conf.d/vidjil.conf
else
    ln -s /etc/vidjil/conf.js /usr/share/vidjil/browser/js/conf.js
    ln -s /etc/vidjil/nginx_vidjil.conf /etc/nginx/conf.d/vidjil.conf
fi

ln -s /etc/vidjil/nginx_gzip_static.conf /etc/nginx/conf.d/vidjil/gzip_static.conf
ln -s /etc/vidjil/nginx_gzip.conf /etc/nginx/conf.d/vidjil/gzip.conf
ln -s /etc/vidjil/uwsgi.conf /etc/nginx/conf.d/vidjil/uwsgi.conf
ln -s /etc/vidjil/germline.js /usr/share/vidjil/browser/js/germline.js
ln -s /usr/share/vidjil/browser /usr/share/vidjil/b
