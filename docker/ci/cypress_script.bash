# This script will launch cypress testing pipeline on specs files
# will also create some symbolic links for server side.

echo "Arguments: $@"

echo "$ change chmod of cypress directory"
chmod 777 cypress -R 
chmod 777 * -R
chmod 777 /app/vidjil/server/py4web/apps/vidjil/databases -R

make -C /app/cypress/fixtures/demo
mkdir -p /app/cypress/fixtures/demo/empty_directory
echo "==> ls /app/cypress/fixtures/demo"
ls /app/cypress/fixtures/demo
echo "==> ls /app/cypress/fixtures/tools/tests/data"
ls /app/cypress/fixtures/tools/tests/data

# for server side
ln -sf $PWD/browser /app/browser || true
ln -sf $PWD/doc  /app/doc        || true
ln -sf $PWD/demo /app/demo       || true
ln -sf $PWD/tools /app/tools     || true


echo "==> PWD: `pwd`"

echo "==> ls /app/vidjil/browser/test/data/addons: `ls /app/vidjil/browser/test/data/addons`"


# Move addons to the correct path for test
if [[ $1 == /app/cypress/e2e/external* ]]
then
	echo "External test, no configuration loaded"
else
	mv /app/vidjil/browser/test/data/addons/* /app/vidjil/browser/js/addons/
	mv /app/vidjil/browser/js/conf.js.sample /app/vidjil/browser/js/conf.js
	files=`printf "'%s'," /app/vidjil/browser/js/addons/*`
	echo -e "Copy addons file: $files"
	sed -i "s|\"js/lib/important-lib.js\", \"js/myscript.js\"|$files|g" "/app/vidjil/browser/js/conf.js"
	sed -i "s|\"use_database\" : true,|\"use_database\" : false,|g" "/app/vidjil/browser/js/conf.js"
	sed -i "s|/\* \"addons\"|\"addons\"|g" "/app/vidjil/browser/js/conf.js"
	sed -i "s|,], \*/|],|g" "/app/vidjil/browser/js/conf.js"
	sed -i "s|/app/vidjil/browser/||g" "/app/vidjil/browser/js/conf.js"
	sed -i "s|\"proxy\": \"https://db.vidjil.org/proxy/\"|\"proxy\": \"https://localhost/proxy/\"|g" "/app/vidjil/browser/js/conf.js"
	if [[ $HOST == local ]]
	then
		sed -i "s|\"db_address\" : \"https://db.vidjil.org/vidjil/\"|\"db_address\" : \"https://localhost/vidjil/\"|g" "/app/vidjil/browser/js/conf.js"
		sed -i "s|\"use_database\" : false|\"use_database\" : true|g" "/app/vidjil/browser/js/conf.js";
	fi

	echo "===== conf.js content ===\n"
	cat /app/vidjil/browser/js/conf.js
	echo "=====\n"
fi



CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}==> ls /app${NC}"
ls /app

echo -e "${CYAN}==> ls /app/browser/test/data${NC}"
ls /app/browser/test/data
echo -e "${CYAN}==> ls /app/doc${NC}"
ls /app/doc
echo -e "${CYAN}==> ls /app/demo${NC}"
ls /app/demo
echo -e "${CYAN}==> ls /app/tools${NC}"
ls /app/tools

echo -e "${CYAN}==> ls cypress/e2e/${NC}"
ls cypress/e2e/



echo "TIME - Before cypress - $(date)"
echo -e "$ ./node_modules/cypress/bin/cypress run --browser $BROWSER --headless --spec $@ --env workdir=vidjil,host=$HOST,initiated_database=false"
./node_modules/cypress/bin/cypress run --browser $BROWSER --headless --spec $@ --env workdir=vidjil,host=$HOST,initiated_database=true
ECODE=$?
echo "TIME - After cypress - $(date)"

# Rename reports with name of testing script
apt-get update -qq && apt-get install -y -qq libxml2-utils
for file in `ls /app/cypress/reports/*.xml`; do mv $file /app/cypress/reports/report_`xmllint --xpath 'string(/testsuites/testsuite/@file)' $file | cut -f3 -d"/" | cut -f1 -d"."`.xml; done

echo "$ change again chmod of cypress directory (include new directories)" 
chmod 777 cypress -R 
echo -e "exit code: $ECODE"

if [ "$ECODE" -ne 0 ]; then echo "command failed"; exit 1; fi
exit 0
