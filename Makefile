
COVERAGE=
VIDJIL_ALGO_SRC = algo/
VIDJIL_BROWSER_SRC = browser/
VIDJIL_SERVER_SRC = server/

ifeq (${COVERAGE},1)
	COVERAGE_OPTION=-O0 --coverage
else
	COVERAGE_OPTION=
endif

all:
	make COVERAGE="$(COVERAGE_OPTION)" -C $(VIDJIL_ALGO_SRC)

test:
	make COVERAGE="$(COVERAGE)" unit
	make should
	make shouldvdj
	make test_tools
	@echo
	@echo "*** All tests passed. Congratulations !"

test_browser: unit_browser functional_browser

test_tools:
	make -C tools/tests

unit: all
	@echo "*** Launching unit tests..."
	make COVERAGE="$(COVERAGE_OPTION)" -C $(VIDJIL_ALGO_SRC)/tests
	@echo "*** All unit tests passed"

should: all
	@echo
	@echo "*** Launching .should_get tests..."
	make COVERAGE="$(COVERAGE_OPTION)" -C $(VIDJIL_ALGO_SRC)/tests should
	@echo "*** All .should_get tests passed"

shouldvdj: all
	@echo
	@echo "*** Launching .should-vdj-fa tests..."
	make COVERAGE="$(COVERAGE_OPTION)" -C $(VIDJIL_ALGO_SRC)/tests shouldvdj
	@echo "*** All .should-vdj.fa tests passed"

shouldvdj_generate:
	@echo
	rm -rf data/gen
	mkdir -p data/gen
	cd germline ; python generate-recombinations.py

shouldvdj_generated_kmer: all
	@echo
	@echo "*** Launching generated .should-vdj-fa tests (and accepts errors) -- Kmer"
	-cd data/gen ; python ../../algo/tests/should-vdj-to-tap.py -2q *.should-vdj.fa
	@echo "*** Generated .should-vdj.fa tests finished -- Kmer"
	python algo/tests/tap-stats.py data/gen/0-*.2.tap
	python algo/tests/tap-stats.py data/gen/5-*.2.tap

shouldvdj_generated_fine: all
	@echo
	@echo "*** Launching generated .should-vdj-fa tests (and accepts errors) -- Fine"
	-cd data/gen ; python ../../algo/tests/should-vdj-to-tap.py *.should-vdj.fa
	@echo "*** Generated .should-vdj.fa tests finished -- Fine"
	python algo/tests/tap-stats.py data/gen/0-*.1.tap
	python algo/tests/tap-stats.py data/gen/5-*.1.tap


unit_browser:
	make -C browser/test unit

functional_browser:
	make -C browser/test functional

headless_browser:
	make -C browser/test headless

### Code coverage

coverage: unit_coverage should_coverage

unit_coverage: clean
	make COVERAGE=1 unit
should_coverage: clean
	make COVERAGE=1 should

### Reports with gcovr

unit_gcovr: unit_coverage
	mkdir -p reports
	which gcovr > /dev/null && (cd algo;  gcovr -r . -e tests/ --xml > ../reports/unit_coverage.xml) || echo "gcovr is needed to generate a full report"
should_gcovr: should_coverage
	mkdir -p reports
	which gcovr > /dev/null && (cd algo; gcovr -r . -e tests/ --xml > ../reports/should_coverage.xml) || echo "gcovr is needed to generate a full report"

### Upload to coveralls.io

unit_coveralls:
	coveralls --exclude release --exclude algo/lib --exclude algo/tests --exclude algo/tools --exclude tests --exclude tools --exclude lib --gcov-options '\-lp'
should_coveralls:
	coveralls --exclude release --exclude algo/lib --exclude algo/tests --exclude algo/tools --exclude tests --exclude tools --exclude lib --gcov-options '\-lp' -r algo


### cppcheck

cppcheck:
	mkdir -p reports
	cppcheck --enable=all --xml . 2>! reports/cppcheck.xml

###

data germline: %:
	make -C $@

clean:
	make -C $(VIDJIL_ALGO_SRC) clean

cleanall: clean
	make -C data $^
	make -C germline $^

.PHONY: all test should clean cleanall distrib data germline unit_coverage should_coverage coverage

RELEASE_TAG="notag"
RELEASE_H = $(VIDJIL_ALGO_SRC)/release.h
RELEASE_SOURCE = $(wildcard $(VIDJIL_ALGO_SRC)/*.cpp) $(wildcard $(VIDJIL_ALGO_SRC)/*.h)  $(wildcard $(VIDJIL_ALGO_SRC)/core/*.cpp)  $(wildcard $(VIDJIL_ALGO_SRC)/tests/*.cpp) $(wildcard $(VIDJIL_ALGO_SRC)/core/*.h)  $(wildcard $(VIDJIL_ALGO_SRC)/tests/*.h)  $(wildcard $(VIDJIL_ALGO_SRC)/cgi/*.cpp) $(wildcard $(VIDJIL_ALGO_SRC)/lib/*.cpp) $(wildcard $(VIDJIL_ALGO_SRC)/lib/*.h) $(wildcard tools/*.py)
RELEASE_MAKE = ./Makefile  $(VIDJIL_ALGO_SRC)/Makefile  $(VIDJIL_ALGO_SRC)/core/Makefile $(VIDJIL_ALGO_SRC)/tests/Makefile $(VIDJIL_ALGO_SRC)/lib/Makefile germline/Makefile data/Makefile tools/tests/Makefile
RELEASE_TESTS =  data/get-sequences $(wildcard data/*.vidjil) $(wildcard data/*.analysis) $(wildcard data/*.fa) $(wildcard data/*.fq)  $(VIDJIL_ALGO_SRC)/tests/should-vdj-to-tap.py $(wildcard $(VIDJIL_ALGO_SRC)/tests/should-vdj-tests/*.should-vdj.fa)  $(VIDJIL_ALGO_SRC)/tests/should-to-tap.sh $(wildcard $(VIDJIL_ALGO_SRC)/tests/*.should_get) $(wildcard $(VIDJIL_ALGO_SRC)/tests/bugs/*.fa)  $(wildcard $(VIDJIL_ALGO_SRC)/tests/bugs/*.should_get) $(VIDJIL_ALGO_SRC)/tests/format-json.sh $(wildcard doc/analysis-example*.vidjil) $(wildcard tools/tests/*.should_get) tools/tests/should-to-tap.sh tools/diff_json.sh
RELEASE_GERMLINES = germline/germline_id germline/get-saved-germline germline/get-germline germline/split-from-imgt.py
RELEASE_FILES = $(RELEASE_SOURCE) $(RELEASE_TESTS) $(RELEASE_MAKE) $(RELEASE_GERMLINES) doc/algo.org doc/LICENSE data/segmentation.fasta $(wildcard data/*.fa.gz) $(wildcard data/*.label)
RELEASE_ARCHIVE = vidjil-$(RELEASE_TAG).tgz

CURRENT_DIR = vidjil
DIST_DIR=$(CURRENT_DIR)-$(RELEASE_TAG)
RELEASE_FILES_VID = $(RELEASE_FILES)

# Browser
RELEASE_JS = $(VIDJIL_BROWSER_SRC)/js/release.js
RELEASE_BROWSER_ARCHIVE = vidjil-browser-$(RELEASE_TAG).tgz
DIST_BROWSER_DIR=vidjil-browser-$(RELEASE_TAG)
TEST_FILES_BROWSER= Makefile $(VIDJIL_BROWSER_SRC)/test/Makefile $(wildcard $(VIDJIL_BROWSER_SRC)/test/*.rb) $(wildcard $(VIDJIL_BROWSER_SRC)/test/QUnit/*)  $(wildcard $(VIDJIL_BROWSER_SRC)/test/QUnit/testFiles/*.js)
RELEASE_FILES_BROWSER=$(TEST_FILES_BROWSER) $(wildcard $(VIDJIL_BROWSER_SRC)/*.html) $(wildcard $(VIDJIL_BROWSER_SRC)/js/*.js) $(wildcard $(VIDJIL_BROWSER_SRC)/js/lib/*.js) $(wildcard $(VIDJIL_BROWSER_SRC)/css/*.css) 

# make distrib RELEASE_TAG=2013.04alpha
distrib:	
	$(info ==== Release $(RELEASE_TAG) ====)

	# Tag the release
	if test "$(RELEASE_TAG)" != "notag"; then \
		git tag -f release-$(RELEASE_TAG); \
		echo '#define RELEASE_TAG "$(RELEASE_TAG)"' > $(RELEASE_H); \
	fi

	mkdir -p release 
	rm -rf release/$(RELEASE_ARCHIVE) release/$(DIST_DIR)
	mkdir -p release/$(DIST_DIR)
	for file in  $(RELEASE_FILES_VID); do\
		dir=release/$(DIST_DIR)/`dirname "$$file"`;	\
		mkdir -p $$dir;	\
		cp "$$file" $$dir;	\
	done
	cd release && tar cvzf  $(RELEASE_ARCHIVE) $(DIST_DIR) \
	&& rm -rf $(DIST_DIR)

	# Untag the source
	rm -f $(RELEASE_H) ; touch $(RELEASE_H)

	# Check archive
	cd release && tar xvfz $(RELEASE_ARCHIVE)
	cd release/$(DIST_DIR) && make
	cd release/$(DIST_DIR) && make germline
	cd release/$(DIST_DIR) && make data
	cd release/$(DIST_DIR) && make test


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
	cd release/$(DIST_BROWSER_DIR) && make unit_browser



