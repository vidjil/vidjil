
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
	$(MAKE) COVERAGE="$(COVERAGE_OPTION)" -C $(VIDJIL_ALGO_SRC)

static:
	$(MAKE) all LDFLAGS="-static -static-libstdc++"

test:
	$(MAKE) COVERAGE="$(COVERAGE)" unit
	$(MAKE) functional
	$(MAKE) test_tools_if_python
	@echo
	@echo "*** All tests passed. Congratulations !"
	@echo
	-($(MAKE) -C algo/tests snapshot)

test_browser: unit_browser functional_browser

test_server: unit_server

test_tools_if_python:
	@((python tools/check_python_version.py && $(MAKE) test_tools) || (python tools/check_python_version.py || echo "!!! Bad python version, we skip tools tests..."))

test_tools:
	$(MAKE) -C tools/tests

unit: all
	@echo "*** Launching unit tests..."
	$(MAKE) COVERAGE="$(COVERAGE_OPTION)" -C $(VIDJIL_ALGO_SRC)/tests
	@echo "*** All unit tests passed"

functional: all
	$(MAKE) should
	$(MAKE) shouldvdj

should: all
	@echo
	@echo "*** Launching .should_get tests..."
	$(MAKE) COVERAGE="$(COVERAGE_OPTION)" -C $(VIDJIL_ALGO_SRC)/tests should
	@echo "*** All .should_get tests passed"

shouldvdj: all
	@echo
	$(MAKE) COVERAGE="$(COVERAGE_OPTION)" -C $(VIDJIL_ALGO_SRC)/tests shouldvdj_if_python

shouldvdj_generate:
	@echo
	rm -rf data/gen
	mkdir -p data/gen
	cd germline ; python generate-recombinations.py --random-deletions 8,4:3,1:5,3 --random-insertions 5,4 -e .01

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

valgrind_unit:
	$(MAKE) -C algo/tests valgrind_tests

valgrind_should:
	$(MAKE) -C algo/tests valgrind_should

unit_browser:
	$(MAKE) -C browser/test unit

functional_browser:
	$(MAKE) -C browser/test functional

headless_browser:
	$(MAKE) -C browser/test headless

unit_server:
	$(MAKE) -C server/ unit

### Code coverage

coverage: unit_coverage should_coverage

unit_coverage: clean
	$(MAKE) COVERAGE=1 unit
should_coverage: clean
	$(MAKE) COVERAGE=1 functional

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
	$(MAKE) -C $@

clean:
	$(MAKE) -C $(VIDJIL_ALGO_SRC) clean

cleanall: clean
	$(MAKE) -C data $^
	$(MAKE) -C germline $^
	$(MAKE) -C $(VIDJIL_ALGO_SRC) cleanall
	$(MAKE) -C server cleanall

.PHONY: all test should clean cleanall distrib data germline unit_coverage should_coverage coverage

RELEASE_TAG="notag"
RELEASE_H = $(VIDJIL_ALGO_SRC)/release.h
RELEASE_SOURCE = $(wildcard $(VIDJIL_ALGO_SRC)/*.cpp) $(wildcard $(VIDJIL_ALGO_SRC)/*.h)  $(wildcard $(VIDJIL_ALGO_SRC)/core/*.cpp)  $(wildcard $(VIDJIL_ALGO_SRC)/tests/*.cpp) $(wildcard $(VIDJIL_ALGO_SRC)/core/*.h)  $(wildcard $(VIDJIL_ALGO_SRC)/tests/*.h)  $(wildcard $(VIDJIL_ALGO_SRC)/cgi/*.cpp) $(wildcard $(VIDJIL_ALGO_SRC)/lib/*.cpp) $(wildcard $(VIDJIL_ALGO_SRC)/lib/*.h) $(wildcard $(VIDJIL_ALGO_SRC)/lib/*.hpp) $(wildcard tools/*.py)
RELEASE_MAKE = ./Makefile  $(VIDJIL_ALGO_SRC)/Makefile  $(VIDJIL_ALGO_SRC)/core/Makefile $(VIDJIL_ALGO_SRC)/tests/Makefile $(VIDJIL_ALGO_SRC)/lib/Makefile germline/Makefile data/Makefile tools/tests/Makefile doc/Makefile
RELEASE_TESTS =  doc/format-analysis.org data/get-sequences $(wildcard data/*.vidjil) $(wildcard data/*.analysis) $(wildcard data/*.data) $(wildcard data/*.fa) $(wildcard data/*.fq)  $(VIDJIL_ALGO_SRC)/tests/should-vdj-to-tap.py $(wildcard $(VIDJIL_ALGO_SRC)/tests/should-vdj-tests/*.should-vdj.fa) $(wildcard $(VIDJIL_ALGO_SRC)/tests/should-vdj-tests/*.should-locus.fa) $(VIDJIL_ALGO_SRC)/tests/should-to-tap.sh $(wildcard $(VIDJIL_ALGO_SRC)/tests/*.should_get) $(wildcard $(VIDJIL_ALGO_SRC)/tests/bugs/*.fa)  $(wildcard $(VIDJIL_ALGO_SRC)/tests/bugs/*.should_get) $(VIDJIL_ALGO_SRC)/tests/format-json.sh $(wildcard doc/analysis-example*.vidjil) $(wildcard tools/tests/*.should_get) tools/tests/should-to-tap.sh tools/diff_json.sh
RELEASE_GERMLINES = germline/germline_id germline/get-saved-germline germline/get-germline germline/split-from-imgt.py germline/germlines.data germline/revcomp-fasta.py germline/fasta.py
RELEASE_HELP = doc/algo.org doc/locus.org doc/dev.org doc/should-vdj.org doc/credits.org doc/CHANGELOG  doc/LICENSE
RELEASE_FILES = $(RELEASE_SOURCE) $(RELEASE_TESTS) $(RELEASE_MAKE) $(RELEASE_GERMLINES) $(RELEASE_HELP) data/segmentation.fasta $(wildcard data/*.fa.gz) $(wildcard data/*.label)
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

# $(MAKE) distrib RELEASE_TAG=2013.04alpha
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
	cd release/$(DIST_DIR) && $(MAKE)
	cd release/$(DIST_DIR) && $(MAKE) germline
	cd release/$(DIST_DIR) && $(MAKE) data
	cd release/$(DIST_DIR) && $(MAKE) test
	cd release/$(DIST_DIR) && $(MAKE) clean && $(MAKE) static && mv vidjil vidjil-$(RELEASE_TAG)_`uname -m`


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



