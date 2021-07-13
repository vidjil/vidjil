echo "$ change chmod of cypress directory"
chmod 777 cypress -R 


echo -e "$ ./node_modules/cypress/bin/cypress run --browser $BROWSER --headless  --env workdir=vidjil,host=$HOST"
./node_modules/cypress/bin/cypress run --browser $BROWSER --headless  --env workdir=vidjil,host=$HOST
ECODE=$?

echo "$ change again chmod of cypress directory (include new directories)" 
chmod 777 cypress -R 
echo -e "exit code: $ECODE"

if [ "$ECODE" -ne 0 ]; then echo "command failed"; exit 1; fi
exit 0