
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

install_web2py_standalone: install_web2py
	mkdir -p web2py/applications/vidjil/databases web2py/upload web2py/result
	sed -i 's@/var/vidjil@logs@' web2py/applications/vidjil/modules/defs.py
	sed -i '/mysql/d; /^DIR_/s/\/mnt\///;'  web2py/applications/vidjil/modules/defs.py

launch_web2py_localhost:
	python web2py/web2py.py -a 'password' -i 127.0.0.1 -p 8000   


launch_fuse_server:
	python fuse_server.py &
kill_fuse_server:
	pkill -f fuse_server.py

clean_unit_tests:
	rm -f web2py/test-reports/*.xml

cleanall: clean_unit_tests
