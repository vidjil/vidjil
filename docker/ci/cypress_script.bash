# This script will launch cypress testing pipeline on specs files
# will also create some symbolic links for server side.

echo "Arguments: $@"

TEST_FILES_PATTERN="$1"

ln -sf /app/vidjil/browser/test/cypress/support /app/cypress/support
ln -sf /app/vidjil/browser/test/cypress/fixtures /app/cypress/fixtures

# Move addons to the correct path for test
if [[ $1 == /app/cypress/e2e/external* ]]
then
	echo "External test, no configuration loaded"
else
	cp /app/vidjil/browser/test/data/addons/* /app/vidjil/browser/js/addons/
	cp /app/vidjil/browser/js/conf.js.sample /app/vidjil/browser/js/conf.js
	files=`printf "'%s'," /app/vidjil/browser/js/addons/*`
	echo -e "Copy addons file: $files"
	sed -i "s|\"js/lib/important-lib.js\", \"js/myscript.js\"|$files|g" "/app/vidjil/browser/js/conf.js"
	sed -i "s|/\* \"addons\"|\"addons\"|g" "/app/vidjil/browser/js/conf.js"
	sed -i "s|,], \*/|],|g" "/app/vidjil/browser/js/conf.js"
	sed -i "s|/app/vidjil/browser/||g" "/app/vidjil/browser/js/conf.js"
	if [[ $HOST != local ]]
	then
		sed -i "s|use_database: true,|use_database: false,|g" "/app/vidjil/browser/js/conf.js"
		sed -i "s|cgi_address: \"https://localhost/cgi/\"|cgi_address: \"https://db.vidjil.org/cgi/\"|g" "/app/vidjil/browser/js/conf.js"
		sed -i "s|db_address: \"https://localhost/vidjil/\"|db_address: \"https://db.vidjil.org/vidjil/\"|g" "/app/vidjil/browser/js/conf.js"
	fi

	sed -i "s/server_version: \".*\"/server_version: \"test\"/g" "/app/vidjil/browser/js/conf.js"

	echo "===== conf.js content ===\n"
	cat /app/vidjil/browser/js/conf.js
	echo "=====\n"
fi

CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}==> ls /app${NC}"
ls /app

echo -e "${CYAN}==> ls /app/cypress${NC}"
ls /app/cypress
echo -e "${CYAN}==> ls /app/cypress/e2e${NC}"
ls /app/cypress/e2e
echo -e "${CYAN}==> ls /app/cypress/support${NC}"
ls /app/cypress/support
echo -e "${CYAN}==> ls /app/cypress/fixtures${NC}"
ls /app/cypress/fixtures
echo -e "${CYAN}==> ls /app/vidjil/browser/test/data${NC}"
ls /app/vidjil/browser/test/data

# RUN CYPRESS
echo "TIME - Before cypress - $(date)"
echo "TEST_FILES_PATTERN: $TEST_FILES_PATTERN"
echo "HOST: $HOST"
echo -e "$ ./node_modules/cypress/bin/cypress run --browser $BROWSER --headless --spec "$TEST_FILES_PATTERN" --env workdir=vidjil,host=$HOST,initiated_database=false"
./node_modules/cypress/bin/cypress run --browser $BROWSER --headless --spec "$TEST_FILES_PATTERN" --env workdir=vidjil,host=$HOST,initiated_database=true,server=$SERVER
ECODE=$?
echo "TIME - After cypress - $(date)"

# Rename reports with name of testing script
apt-get update -qq && apt-get install -y -qq libxml2-utils
for file in `ls /app/cypress/reports/*.xml`
	do mv $file /app/cypress/reports/report_`xmllint --xpath 'string(/testsuites/testsuite/@file)' $file | cut -f3 -d"/" | cut -f1 -d"."`.xml
done

# Remove created links
if [ -L "/app/cypress/support" ]
then
	echo "remove /app/cypress/support"
	rm -v "/app/cypress/support";
fi
if [ -L "/app/cypress/fixtures" ]
then
	echo "remove /app/cypress/fixtures"
	rm -v "/app/cypress/fixtures";
fi

if [ "$ECODE" -ne 0 ]; then echo "command failed"; exit 1; fi
exit 0
