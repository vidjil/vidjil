
data:
	sh nginx_install.sh


install_web2py:
	wget http://web2py.com/examples/static/web2py_src.zip
	unzip web2py_src.zip
	mv web2py/handlers/wsgihandler.py web2py/wsgihandler.py
	rm web2py_src.zip
	cp -i web2py/applications/vidjil/modules/defs.py.sample web2py/applications/vidjil/modules/defs.py

install_unit_tests:
	pip install unittest2
	pip install unittest-xml-reporting

unit: clean_unit_tests
	cd web2py; python web2py.py -S vidjil -M -R testRunner.py

clean_unit_tests:
	rm -f web2py/test-reports/*.xml

cleanall: clean_unit_tests
