if [[ ! -f /usr/share/vidjil/browser/js/conf.js ]]; then echo "Conf.js file NOT found" && exit 1; fi

server=`grep db_address /usr/share/vidjil/browser/js/conf.js | cut -f4 -d '"'`
usage=`grep use_database /usr/share/vidjil/browser/js/conf.js | cut -f2 -d ':'`

echo -e "Conf.js found;"
echo -e "\tServer: $server"
echo -e "\tUsage: $usage"
echo "Test communication with setted server..."

echo -e "wget --no-check-certificate ${server}/user/ -O healthcheck_test.html -q"
wget --no-check-certificate ${server}/user/ -O healthcheck_test.html -q

if ! grep -q "login page" healthcheck_test.html; then
    echo "Login page pattern not found in db page"
    echo "Server seem to be not reachable"
    exit 1 
else  
    echo "Login page found"
    echo "Client and server seem to be connected"
fi

if [ $usage != " true," ] ; then
    echo "Usage of db is set to ${usage}"
    exit 1 
fi


echo "=== Cat conf.js"
cat /usr/share/vidjil/browser/js/conf.js

echo "=== Wget homepage"
cat healthcheck_test.html

exit 0
