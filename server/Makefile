
WEB2PY_VERSION=2.20.1

install:  $(MAKE) -C py4web/ install_py4web

download_web2py:
	wget -O web2py_src.zip http://www.vidjil.org/lib/web2py_src-${WEB2PY_VERSION}.zip

install_web2py: download_web2py
	unzip web2py_src.zip
	mv web2py/handlers/wsgihandler.py web2py/wsgihandler.py
	rm web2py_src.zip
	cp web2py/applications/vidjil/modules/defs.py.sample web2py/applications/vidjil/modules/defs.py

unit: clean_unit
	PYDAL_URI='sqlite://storage.db' pytest py4web/apps/vidjil/tests/unit --junitxml=unit_report.xml --cov=py4web/apps/vidjil --cov-report xml:unit_coverage.xml

functional:
	$(MAKE) -C web2py/applications/vidjil/tests functional

tutorial:
	$(MAKE) -C web2py/applications/vidjil/tests tutorial

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

clean_unit:
	rm -f unit_report.xml
	rm -f unit_coverage.xml

cleanall: clean_unit

.PHONY: install
