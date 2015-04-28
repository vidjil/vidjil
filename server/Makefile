
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

standalone_install: install_unit_tests
	mkdir -p web2py/applications/vidjil/databases web2py/upload web2py/result
	sed -i 's@/var/vidjil@logs@' web2py/applications/vidjil/modules/defs.py
	sed -i '/mysql/d; /^DIR_/s/\/mnt\///; s/PORT_FUSE_SERVER = .*/PORT_FUSE_SERVER = None/'  web2py/applications/vidjil/modules/defs.py

launch_fuse_server:
	python fuse_server.py &
kill_fuse_server:
	pkill -f fuse_server.py

clean_unit_tests:
	rm -f web2py/test-reports/*.xml

cleanall: clean_unit_tests
