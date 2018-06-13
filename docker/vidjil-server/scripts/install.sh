#!/bin/bash
echo "${BUILD_ENV}"
if [ "${BUILD_ENV}" = "TEST"  ]; then
    cp -avr /opt/vidjil_conf/defs_http.py /etc/vidjil/defs.py
else
    cp -avr /opt/vidjil_conf/defs.py /etc/vidjil/defs.py
fi;

