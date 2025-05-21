
VIDJIL_ALGO_SRC = algo/
VIDJIL_BROWSER_SRC = browser/
VIDJIL_SERVER_SRC = server/
CYPRESS_BROWSER = browsers/firefox_supported/chrome

TEE = python tools/tee.py -v

algo:
	$(MAKE) -C algo

test_browser: unit_browser functional_browser

test_server: unit_server

test_tools_if_python:
	@((python tools/check_python_version.py && $(MAKE) test_tools) || (python tools/check_python_version.py || echo "!!! Bad python version, we skip tools tests..."))

test_tools:
	$(MAKE) -C tools/tests

shouldvdj_generate:
	@echo
	rm -rf data/gen
	mkdir -p data/gen
	cd germline ; python generate-recombinations.py --random-deletions 8,4:3,1:5,3 --random-insertions 5,4 -e .01


### Browser tests

unit_browser:
	$(MAKE) -C browser/test unit


unit_server:
	$(MAKE) -C server/ unit



###############################
### Browser tests WITH CYPRESS
build_cypress_image:
	docker build ./docker/ci -t "vidjilci/cypress_with_browsers:latest"

functional_browser_cypress_open:
	# Need to create a symbolic link; but allow to directly see result
	# Useful for fast debugging; allow to launch script one by one
	mv browser/js/conf.js browser/js/conf.js.bak || true
	cp browser/js/conf.js.sample browser/js/conf.js
	sed -i "s|use_database: true,|use_database: false,|g" browser/js/conf.js
	sed -i "s|cgi_address: \"https://localhost/cgi/\"|cgi_address: \"https://db.vidjil.org/cgi/\"|g" browser/js/conf.js
	sed -i "s|db_address: \"https://localhost/vidjil/\"|db_address: \"https://db.vidjil.org/vidjil/\"|g" browser/js/conf.js
	sed -i "s/server_version: \".*\"/server_version: \"test\"/g" browser/js/conf.js
	ln -sf browser/test/cypress
	ln -sf docker/ci/cypress.config.js
	python tools/org-babel-tangle.py --all doc/vidjil-format.md && mv analysis-example* doc/
	./node_modules/cypress/bin/cypress open --env workdir=../,host=local,server=false
	cp browser/js/conf.js.bak browser/js/conf.js || true

functional_browser_cypress:
	docker run --rm \
		-v `pwd`/browser/test/cypress:/app/cypress \
		-v `pwd`:/app/vidjil \
		-v "`pwd`/docker/ci/cypress_script.bash":"/app/script.bash" \
		-v "`pwd`/docker/ci/script_preprocess.bash":"/app/script_preprocess.bash" \
		-v "`pwd`/docker/ci/cypress.config.js":"/app/cypress.config.js" \
		--env BROWSER=$(CYPRESS_BROWSER) --env SERVER=false "vidjilci/cypress_with_browsers:12.9" bash script.bash "/app/cypress/e2e/test_*.js"

functional_tutorial_browser_cypress:
	$(MAKE) -C doc/tutorial build_tutorial_cypress_client
	docker run --rm \
		-v `pwd`/browser/test/cypress:/app/cypress \
		-v `pwd`:/app/vidjil \
		-v "`pwd`/docker/ci/cypress_script.bash":"/app/script.bash" \
		-v "`pwd`/docker/ci/script_preprocess.bash":"/app/script_preprocess.bash" \
		-v "`pwd`/docker/ci/cypress.config.js":"/app/cypress.config.js" \
		--env BROWSER=$(CYPRESS_BROWSER) --env SERVER=false "vidjilci/cypress_with_browsers:12.9" bash script.bash "/app/cypress/e2e/doc_*.js"

functional_browser_external_cypress:
	docker run --rm \
		-v `pwd`/browser/test/cypress:/app/cypress \
		-v `pwd`:/app/vidjil \
		-v "`pwd`/docker/ci/cypress_script.bash":"/app/script.bash" \
		-v "`pwd`/docker/ci/script_preprocess.bash":"/app/script_preprocess.bash" \
		-v "`pwd`/docker/ci/cypress.config.js":"/app/cypress.config.js" \
		--env BROWSER=$(CYPRESS_BROWSER) --env SERVER=false "vidjilci/cypress_with_browsers:12.9" bash script.bash "/app/cypress/e2e/external_*.js"

functional_server_cypress_open:
	ln -sf server/py4web/apps/vidjil/tests/cypress/ .
	rm -r cypress/fixtures  cypress/plugins  cypress/support  cypress.config.js || true
	ln -sf ../../../../../../browser/test/cypress/plugins  cypress/plugins
	ln -sf ../../../../../../browser/test/cypress/support  cypress/support
	ln -sf docker/ci/cypress.config.js
	python tools/org-babel-tangle.py --all doc/vidjil-format.md && mv analysis-example* doc/
	./node_modules/cypress/bin/cypress open --env workdir=../,host=local,server=true

functional_tutorial_server_cypress:
	$(MAKE) -C doc/tutorial build_tutorial_cypress_client
	# Need to have a local server deploy with the ci data integrated
	docker run --rm \
		-v `pwd`/server/py4web/apps/vidjil/tests/cypress:/app/cypress \
		-v `pwd`:/app/vidjil \
		-v "`pwd`/docker/ci/cypress_script.bash":"/app/script.bash" \
		-v "`pwd`/docker/ci/script_preprocess.bash":"/app/script_preprocess.bash" \
		-v "`pwd`/docker/ci/cypress.config.js":"/app/cypress.config.js" \
		--network="host" \
		--env BROWSER=$(CYPRESS_BROWSER) --env HOST=local --env SERVER=true "vidjilci/cypress_with_browsers:12.9" bash script.bash "/app/cypress/e2e/doc_*.js"


functional_server_cypress:
	# Need to have a local server deploy with the ci data integrated
	docker run --rm \
		-v `pwd`/server/py4web/apps/vidjil/tests/cypress:/app/cypress \
		-v `pwd`:/app/vidjil \
		-v "`pwd`/docker/ci/cypress_script.bash":"/app/script.bash" \
		-v "`pwd`/docker/ci/script_preprocess.bash":"/app/script_preprocess.bash" \
		-v "`pwd`/docker/ci/cypress.config.js":"/app/cypress.config.js" \
		--network="host" \
		--env BROWSER=$(CYPRESS_BROWSER) --env HOST=local --env SERVER=true "vidjilci/cypress_with_browsers:12.9" bash script.bash "/app/cypress/e2e/test_table_db.cy.js"

###############################


###

init_repository:
	git config --local core.hooksPath .githooks/

data:
	$(MAKE) -C algo/tests/data

demo germline browser server: %:
	$(MAKE) -C $@

cleanall: clean
	$(MAKE) -C algo/tests/data $^
	$(MAKE) -C germline $^
	$(MAKE) -C $(VIDJIL_ALGO_SRC) cleanall
	$(MAKE) -C server cleanall

.PHONY: all test should clean cleanall distrib init_repository data demo germline unit_coverage should_coverage coverage data germline browser server doc algo


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



