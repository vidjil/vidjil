echo "$ change chmod of cypress directory"
chmod 777 cypress -R 

make -C /app/cypress/fixtures/demo
mkdir -p /app/cypress/fixtures/demo/empty_directory
echo "==> ls /app/cypress/fixtures/demo"
ls /app/cypress/fixtures/demo
echo "==> ls /app/cypress/fixtures/tools/tests/data"
ls /app/cypress/fixtures/tools/tests/data

echo "==> PWD: `pwd`"

echo "==> ls /app/vidjil/browser/test/data/addons: `ls /app/vidjil/browser/test/data/addons`"


# Move addons to the correct path for test
mv /app/vidjil/browser/test/data/addons/* /app/vidjil/browser/js/addons/
mv /app/vidjil/browser/test/data/confs/conf_no_db.js /app/vidjil/browser/js/conf.js
files=`printf "'%s'," /app/vidjil/browser/js/addons/*`
echo -e "Copy addons file: $files"
sed -i "s|\"addons\" : \[|\"addons\" : [$files|" "/app/vidjil/browser/js/conf.js"
sed -i "s|,]|]|g" "/app/vidjil/browser/js/conf.js"
sed -i "s|/app/vidjil/browser/||g" "/app/vidjil/browser/js/conf.js"


echo "===== conf.js content ===\n"
cat /app/vidjil/browser/js/conf.js
echo "=====\n"

echo -e "$ ./node_modules/cypress/bin/cypress run --browser $BROWSER --headless --spec $@ --env workdir=vidjil,host=$HOST,initiated_database=false"
./node_modules/cypress/bin/cypress run --browser $BROWSER --headless --spec $@ --env workdir=vidjil,host=$HOST,initiated_database=false
ECODE=$?

echo "$ change again chmod of cypress directory (include new directories)" 
chmod 777 cypress -R 
echo -e "exit code: $ECODE"

if [ "$ECODE" -ne 0 ]; then echo "command failed"; exit 1; fi
exit 0