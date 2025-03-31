#!/bin/sh

npm install --save-dev qunit
npm link nightmare --unsafe-perm=true
apt-get update && apt-get -y install xvfb grep
make demo data germline
make -C browser sha1
cp -p doc/analysis-example.vidjil browser/
make unit_browser
