echo "$ change chmod of cypress directory"
chmod 777 cypress -R 

make -C /app/cypress/fixtures/demo
mkdir -p /app/cypress/fixtures/demo/empty_directory
echo "==> ls /app/cypress/fixtures/demo"
ls /app/cypress/fixtures/demo
echo "==> ls /app/cypress/fixtures/tools/tests"
ls /app/cypress/fixtures/tools/tests

echo "==> PWD: `pwd`"


echo -e "$ ./node_modules/cypress/bin/cypress run --browser $BROWSER --headless  --env workdir=vidjil,host=$HOST,initiated_database=false"
./node_modules/cypress/bin/cypress run --browser $BROWSER --headless  --env workdir=vidjil,host=$HOST,initiated_database=false
ECODE=$?

echo "$ change again chmod of cypress directory (include new directories)" 
chmod 777 cypress -R 
echo -e "exit code: $ECODE"

if [ "$ECODE" -ne 0 ]; then echo "command failed"; exit 1; fi
exit 0