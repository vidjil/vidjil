
all: unit functional

unit: phantomjs

headless:
	HEADLESS=1 $(MAKE) functional

functional: ../../doc/analysis-example1.vidjil
	sh launch_functional_tests

functional-rbx: ../../doc/analysis-example1.vidjil
	LIVE_SERVER=http://rbx.vidjil.org/browser/ ruby test_browser.rb

phantomjs:
	cd QUnit ; phantomjs phantom_test.js

../../doc/%:
	$(MAKE) -C ../../doc $@

.PHONY: phantomjs unit functional headless all
