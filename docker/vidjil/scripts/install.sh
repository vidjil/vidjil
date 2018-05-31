#!/bin/bash
echo "${BUILD_ENV}"
if [ "${BUILD_ENV}" = "TEST"  ]; then
    cp -avr /opt/vidjil_conf/defs_http.py /etc/vidjil/defs.py
    cp -avr /opt/vidjil_conf/conf_http.js /etc/vidjil/conf.js
    cp -avr /opt/vidjil_conf/web2py_http /etc/nginx/sites-enabled/web2py

    apt-get update
    apt-get install -y gcc make ruby-full firefox xvfb
    gem install bundler
    cd /usr/share/vidjil
    bundle install
    cd /usr/bin
    wget https://github.com/mozilla/geckodriver/releases/download/v0.20.1/geckodriver-v0.20.1-linux32.tar.gz
    tar -xvzf geckodriver-v0.20.1-linux32.tar.gz
    unlink geckodriver-v0.20.1-linux32.tar.gz
    chmod +x geckodriver
else
    cp -avr /opt/vidjil_conf/defs.py /etc/vidjil/defs.py
    cp -avr /opt/vidjil_conf/conf.js /etc/vidjil/conf.js
    cp -avr /opt/vidjil_conf/web2py /etc/nginx/sites-enabled/web2py
fi;

