
VIDJIL_ALGO_SRC = algo/
VIDJIL_BROWSER_SRC = browser/
VIDJIL_SERVER_SRC = server/

TEE = python tools/tee.py -v

algo:
	$(MAKE) -C algo

test_browser: unit_browser functional_browser

test_server: unit_server

test_tools_if_python:
	@((python tools/check_python_version.py && $(MAKE) test_tools) || (python tools/check_python_version.py || echo "!!! Bad python version, we skip tools tests..."))

test_tools:
	$(MAKE) -C tools/tests

test_tutorial:
	$(MAKE) -C doc/tutorial tutorial-test.rb
	$(MAKE) -C browser/test tutorial 

test_tutorial_server:
	$(MAKE) -C doc/tutorial tutorial-server.rb
	wget http://vidjil.org/seqs/tutorial_dataset.zip
	unzip -o tutorial_dataset.zip
	$(MAKE) -C server tutorial

shouldvdj_generate:
	@echo
	rm -rf data/gen
	mkdir -p data/gen
	cd germline ; python generate-recombinations.py --random-deletions 8,4:3,1:5,3 --random-insertions 5,4 -e .01


### Browser tests

unit_browser:
	$(MAKE) -C browser/test unit

functional_browser:
	$(MAKE) -C browser/test functional

headless_browser:
	$(MAKE) -C browser/test headless

unit_server:
	$(MAKE) -C server/ unit

functional_server:
	$(MAKE) -C server functional

headless_server:
	$(MAKE) -C server headless


###############################
### Browser tests WITH CYPRESS
build_cypress_image:
	docker build ./docker/ci  -t "vidjilci/cypress_with_browsers:latest"

functional_browser_cypress_open:
	# Need to create a symbolic link; but allow to directly see result
	# Usefull for fast debugging; allow to launch script one by one
	ln -sf browser/test/cypress
	python tools/org-babel-tangle.py --all doc/vidjil-format.md && mv analysis-example* doc/
	cypress open --env workdir=../,host=localhost

functional_browser_cypress:
	docker run \
		-v `pwd`/browser/test/cypress:/app/cypress \
		-v `pwd`/browser/test/data/:/app/cypress/fixtures/data/  \
		-v `pwd`/doc/:/app/cypress/fixtures/doc/  \
		-v `pwd`/demo/:/app/cypress/fixtures/demo/  \
		-v `pwd`:/app/vidjil \
		-v "`pwd`/docker/ci/cypress_script.bash":"/app/script.bash" \
		-v "`pwd`/docker/ci/script_preprocess.bash":"/app/script_preprocess.bash" \
		-v "`pwd`/docker/ci/cypress.json":"/app/cypress.json" \
		--env BROWSER=electron --env HOST=localhost "vidjilci/cypress_with_browsers:latest" bash script.bash



functional_server_cypress_open:
	ln -sf server/web2py/applications/vidjil/tests/cypress/ .
	rm -r cypress/fixtures  cypress/plugins  cypress/support || true
	ln -sf ../../../../../../browser/test/cypress/fixtures cypress/fixtures
	ln -sf ../../../../../../browser/test/cypress/plugins  cypress/plugins
	ln -sf ../../../../../../browser/test/cypress/support  cypress/support
	python tools/org-babel-tangle.py --all doc/vidjil-format.md && mv analysis-example* doc/
	cypress open --env workdir=../,host=local

functional_server_cypress:
	# Need to have a local server deploy with the ci data integrated
	docker run \
		-v `pwd`/browser/test/cypress:/app/cypress \
		-v `pwd`/server/web2py/applications/vidjil/tests/cypress/integration:/app/cypress/integration \
		-v `pwd`/browser/test/data/:/app/cypress/fixtures/data/  \
		-v `pwd`/doc/:/app/cypress/fixtures/doc/  \
		-v `pwd`/demo/:/app/cypress/fixtures/demo/  \
		-v `pwd`:/app/vidjil \
		-v "`pwd`/docker/ci/cypress_script.bash":"/app/script.bash" \
		-v "`pwd`/docker/ci/script_preprocess.bash":"/app/script_preprocess.bash" \
		-v "`pwd`/docker/ci/cypress.json":"/app/cypress.json" \
		--network="host" \
		--env BROWSER=electron --env HOST=local "vidjilci/cypress_with_browsers:latest" bash script.bash

###############################


tutorial-test.rb:
	$(MAKE) -C doc/tutorial tutorial-test.rb
###

data:
	$(MAKE) -C algo/tests/data

demo germline browser server: %:
	$(MAKE) -C $@

cleanall: clean
	$(MAKE) -C algo/tests/data $^
	$(MAKE) -C germline $^
	$(MAKE) -C $(VIDJIL_ALGO_SRC) cleanall
	$(MAKE) -C server cleanall

.PHONY: all test should clean cleanall distrib data demo germline unit_coverage should_coverage coverage data germline browser server doc algo



# Browser
RELEASE_JS = $(VIDJIL_BROWSER_SRC)/js/release.js
RELEASE_BROWSER_ARCHIVE = vidjil-browser-$(RELEASE_TAG).tgz
DIST_BROWSER_DIR=vidjil-browser-$(RELEASE_TAG)
TEST_FILES_BROWSER= Makefile $(VIDJIL_BROWSER_SRC)/test/Makefile $(wildcard $(VIDJIL_BROWSER_SRC)/test/*.rb) $(wildcard $(VIDJIL_BROWSER_SRC)/test/QUnit/*)  $(wildcard $(VIDJIL_BROWSER_SRC)/test/QUnit/testFiles/*.js)
RELEASE_FILES_BROWSER=$(TEST_FILES_BROWSER) $(wildcard $(VIDJIL_BROWSER_SRC)/*.html) $(wildcard $(VIDJIL_BROWSER_SRC)/js/*.js) $(wildcard $(VIDJIL_BROWSER_SRC)/js/lib/*.js) $(wildcard $(VIDJIL_BROWSER_SRC)/css/*.css) 


release_browser:
	$(info ==== Browser Release $(RELEASE_TAG) ====)

	# Tag the release
	if test "$(RELEASE_TAG)" != "notag"; then \
		git tag -f release-$(RELEASE_TAG); \
		echo 'RELEASE_TAG = "$(RELEASE_TAG)"' > $(RELEASE_JS); \
	fi

	mkdir -p release 
	rm -rf release/$(RELEASE_BROWSER_ARCHIVE) release/$(DIST_BROWSER_DIR)
	mkdir -p release/$(DIST_BROWSER_DIR)
	for file in  $(RELEASE_FILES_BROWSER); do\
		dir=release/$(DIST_BROWSER_DIR)/`dirname "$$file"`;	\
		mkdir -p $$dir;	\
		cp "$$file" $$dir;	\
	done
	cd release && tar cvzf  $(RELEASE_BROWSER_ARCHIVE) $(DIST_BROWSER_DIR) \
	&& rm -rf $(DIST_BROWSER_DIR)

	# Untag the source
	rm -f $(RELEASE_JS) ; touch $(RELEASE_JS)

	# Check archive
	cd release && tar xvfz $(RELEASE_BROWSER_ARCHIVE)
	cd release/$(DIST_BROWSER_DIR) && $(MAKE) unit_browser



