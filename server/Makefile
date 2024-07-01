

install:  $(MAKE) -C py4web/ install_py4web

unit: clean_unit
	PYDAL_URI='sqlite://storage.db' pytest py4web/apps/vidjil/tests/unit --junitxml=unit_report.xml --cov=py4web/apps/vidjil --cov-report xml:unit_coverage.xml


launch_fuse_server:
	python fuse_server.py &
kill_fuse_server:
	pkill -f fuse_server.py

clean_unit:
	rm -f unit_report.xml
	rm -f unit_coverage.xml

cleanall: clean_unit

.PHONY: install
