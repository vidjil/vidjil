
data:
	sh nginx_install.sh

unit: clean_unit_tests
	cd web2py; python web2py.py -S vidjil -M -R testRunner.py

clean_unit_tests:
	rm -f web2py/test-reports/*.xml

cleanall: clean_unit_tests
