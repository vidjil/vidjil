
all: unit functional

unit: nightmare

headless:
	HEADLESS=1 $(MAKE) functional
	HEADLESS=1 $(MAKE) external

functional: ../../doc/analysis-example1.vidjil ../../tools/tests/data/fused_multiple.vidjil
	KEEPOPEN=0 sh launch_functional_tests $(BROWSERS)  functional/test_*rb
	KEEPOPEN=0 sh launch_functional_tests $(BROWSERS)  functional/issues/test_*rb

tutorial:
	$(MAKE) -C ../../demo all
	KEEPOPEN=0 sh launch_functional_tests $(BROWSERS)  functional/tutorial-test.rb

external: ../../doc/analysis-example1.vidjil
	sh launch_functional_tests $(BROWSERS) functional/external_test_*rb

functional-rbx: ../../doc/analysis-example1.vidjil
	LIVE_SERVER=http://app.vidjil.org/browser/ ruby test_browser.rb

nightmare: SHELL:=/bin/bash
nightmare:
	cd QUnit ; \
	npm link nightmare --unsafe-perm=true ; \
	[ `xvfb-run -a node nightmare.js | tee >(cat >&2) | grep -c '^not ok'` -eq 0 ] && [ -f tap_output ]

quality:
	make -C .. quality

../../doc/%:
	$(MAKE) -C ../../doc $@

../../tools/tests/%:
	$(MAKE) -C ../../tools/tests data/$(notdir $@)

.PHONY: unit functional headless all
