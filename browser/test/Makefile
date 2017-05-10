
all: unit functional

unit: nightmare

headless:
	HEADLESS=1 $(MAKE) functional

functional: ../../doc/analysis-example1.vidjil
	sh launch_functional_tests

functional-rbx: ../../doc/analysis-example1.vidjil
	LIVE_SERVER=http://app.vidjil.org/browser/ ruby test_browser.rb

nightmare: SHELL:=/bin/bash
nightmare:
	cd QUnit ; \
	[ `xvfb-run node nightmare.js | tee >(cat >&2) | grep -c '^not ok'` -eq 0 ]

quality:
	make -C .. quality

../../doc/%:
	$(MAKE) -C ../../doc $@

.PHONY: unit functional headless all
