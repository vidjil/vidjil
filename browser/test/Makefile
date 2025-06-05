
all: unit

unit: nightmare

docker_unit:
	docker run --rm \
		-v `pwd`/../..:/app \
		"vidjilci/cypress_with_browsers:12.9" bash browser/test/unit_browser_test.sh

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

.PHONY: unit all docker_unit
