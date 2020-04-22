
WEB2PY_VERSION=2.17.2

install: install_web2py

download_web2py:
	wget http://web2py.com/examples/static/${WEB2PY_VERSION}/web2py_src.zip

install_web2py: download_web2py
	unzip web2py_src.zip
	mv web2py/handlers/wsgihandler.py web2py/wsgihandler.py
	rm web2py_src.zip
	cp web2py/applications/vidjil/modules/defs.py.sample web2py/applications/vidjil/modules/defs.py

unit: clean_unit_tests
	python web2py/web2py.py -S vidjil -M -R testRunner.py

functional:
	$(MAKE) -C web2py/applications/vidjil/tests functional

headless:
	HEADLESS=1 $(MAKE) -C web2py/applications/vidjil/tests functional

install_web2py_standalone: install_web2py
	mkdir -p web2py/applications/vidjil/databases web2py/upload/uploads web2py/result/results
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

.PHONY: install install_web2py unit install_web2py_standalone launch_web2py_localhost launch_fuse_server kill_fuse_server clean_unit_tests cleanall
