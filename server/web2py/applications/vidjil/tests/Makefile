all: functional

headless:
	HEADLESS=1 $(MAKE) functional

functional:
	 sh launch_functional_tests $(BROWSERS) functional/test_*.rb

tutorial:
	KEEPOPEN=0 sh launch_functional_tests $(BROWSERS)  functional/tutorial-server.rb

.PHONY: all functional headless
