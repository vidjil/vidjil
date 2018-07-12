all: functional

headless:
	HEADLESS=1 $(MAKE) functional

functional:
	 sh launch_functional_tests functional/test_*.rb

.PHONY: all functional headless
