
COVERAGE=
VIDJIL_ALGO_SRC = algo/
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
	# make pytests

test_with_fuse:
	make COVERAGE="$(COVERAGE)" unit
	make should
	make pytests

test_browser: unit_browser functional_browser


unit: all
	@echo "*** Launching unit tests..."
	make COVERAGE="$(COVERAGE_OPTION)" -C $(VIDJIL_ALGO_SRC)/tests
	@echo "*** All unit tests passed"

pytests:
	@echo "*** Launching python tests..."
	python server/fuse.py --test x
	@echo "*** All python tests passed"

should: all
	@echo
	@echo "*** Launching .should_get tests..."
	make COVERAGE="$(COVERAGE_OPTION)" -C $(VIDJIL_ALGO_SRC)/tests should
	@echo "*** All .should_get tests passed"

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
	which gcovr > /dev/null && (cd algo;  gcovr -r . -e tests/ --xml > unit_coverage.xml) || echo "gcovr is needed to generate a full report"
should_gcovr: should_coverage
	which gcovr > /dev/null && (cd algo; gcovr -r . -e tests/ --xml > should_coverage.xml) || echo "gcovr is needed to generate a full report"

### Upload to coveralls.io

unit_coveralls:
	coveralls --exclude release --exclude algo/lib --exclude algo/tests --exclude algo/tools --exclude tests --exclude tools --exclude lib --gcov-options '\-lp'
should_coveralls:
	coveralls --exclude release --exclude algo/lib --exclude algo/tests --exclude algo/tools --exclude tests --exclude tools --exclude lib --gcov-options '\-lp' -r algo

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
RELEASE_SOURCE = $(wildcard $(VIDJIL_ALGO_SRC)/*.cpp) $(wildcard $(VIDJIL_ALGO_SRC)/*.h)  $(wildcard $(VIDJIL_ALGO_SRC)/core/*.cpp)  $(wildcard $(VIDJIL_ALGO_SRC)/tests/*.cpp) $(wildcard $(VIDJIL_ALGO_SRC)/core/*.h)  $(wildcard $(VIDJIL_ALGO_SRC)/tests/*.h)  $(wildcard $(VIDJIL_ALGO_SRC)/cgi/*.cpp) $(wildcard $(VIDJIL_ALGO_SRC)/lib/*.cpp) $(wildcard $(VIDJIL_ALGO_SRC)/lib/*.h)
RELEASE_MAKE = ./Makefile  $(VIDJIL_ALGO_SRC)/Makefile  $(VIDJIL_ALGO_SRC)/core/Makefile $(VIDJIL_ALGO_SRC)/tests/Makefile $(VIDJIL_ALGO_SRC)/lib/Makefile germline/Makefile data/Makefile
RELEASE_TESTS =  data/get-sequences $(wildcard data/*.fa) $(wildcard data/*.fq) $(VIDJIL_ALGO_SRC)/tests/should-to-tap.sh $(wildcard $(VIDJIL_ALGO_SRC)/tests/*.should_get) $(wildcard $(VIDJIL_ALGO_SRC)/tests/bugs/*.fa)  $(wildcard $(VIDJIL_ALGO_SRC)/tests/bugs/*.should_get) $(VIDJIL_ALGO_SRC)/tests/format-json.sh
RELEASE_FILES = $(RELEASE_SOURCE) $(RELEASE_TESTS) $(RELEASE_MAKE)  germline/get-saved-germline germline/get-germline germline/split-from-imgt.py  doc/algo.org doc/LICENSE data/segmentation.fasta $(wildcard data/*.fa.gz) $(wildcard data/*.label)
RELEASE_ARCHIVE = vidjil-$(RELEASE_TAG).tgz

CURRENT_DIR = vidjil
DIST_DIR=$(CURRENT_DIR)-$(RELEASE_TAG)
RELEASE_FILES_VID = $(RELEASE_FILES)


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



