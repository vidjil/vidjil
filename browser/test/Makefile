
all: unit functional

unit: phantomjs

headless:
	HEADLESS=1 make functional

functional: ../../doc/analysis-example1.vidjil
	ruby test_browser.rb

functional-rbx: ../../doc/analysis-example1.vidjil
	LIVE_SERVER=http://rbx.vidjil.org/browser/ ruby test_browser.rb

phantomjs:
	cd QUnit ; phantomjs phantom_test.js

../../doc/%:
	make -C ../../doc $@

.PHONY: phantomjs unit functional headless all
