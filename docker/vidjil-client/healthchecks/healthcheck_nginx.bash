#!/bin/bash

CONF_FILE="/usr/share/vidjil/browser/js/conf.js"

echo "conf file : $CONF_FILE"

if [[ ! -f $CONF_FILE ]]; then echo "Conf.js file NOT found" && exit 1; fi

server=`grep db_address $CONF_FILE | cut -f4 -d '"'`
usage=`grep use_database $CONF_FILE | cut -f2 -d ':'`

echo -e "Conf.js found;"
echo -e "\tServer: $server"
echo -e "\tUsage: $usage"
echo "=== Cat conf.js"
cat $CONF_FILE
echo
echo

echo "Test communication with setted server..."

echo -e "wget --no-check-certificate ${server}/user/ -O healthcheck_test.html -q"
wget --no-check-certificate ${server}/user -O healthcheck_test.html -q

echo "==> Wget homepage"
cat healthcheck_test.html
echo
echo

if grep -q "login page" healthcheck_test.html; then
    echo "Login page found"
    echo "Client and server seem to be connected"
else  
    echo "Login page pattern not found in db page"
    echo "Server seem to be not reachable"
    exit 1 
fi

exit 0
