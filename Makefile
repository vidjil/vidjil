
all:
	make -C src

test: all
	make -C src/tests 
	make should

should: all
	@echo
	@echo "*** Launching .should_get tests..."
	src/tests/should-to-tap.sh src/tests/stanford.should_get
	src/tests/should-to-tap.sh src/tests/clones_simul.should_get
	src/tests/should-to-tap.sh src/tests/clones_simul_cluster.should_get
	src/tests/should-to-tap.sh src/tests/segment_S22.should_get
	src/tests/should-to-tap.sh src/tests/segment_lec.should_get
	src/tests/should-to-tap.sh src/tests/segment_simul.should_get
	@echo "*** All .should_get tests passed"

data germline: %:
	make -C $@

clean:
	make -C src clean

cleanall: clean
	make -C data $^
	make -C germline $^

.PHONY: all test should clean cleanall distrib data germline

RELEASE_H = src/release.h
RELEASE_SOURCE = $(wildcard src/*.cpp) $(wildcard src/*.h)  $(wildcard src/core/*.cpp)  $(wildcard src/tests/*.cpp) $(wildcard src/core/*.h)  $(wildcard src/tests/*.h)  
RELEASE_MAKE = ./Makefile  src/Makefile src/tests/Makefile germline/Makefile data/Makefile
RELEASE_TESTS =  data/get-sequences $(wildcard data/*.fa) $(wildcard data/*.fq) src/tests/should-to-tap.sh $(wildcard src/tests/*.should_get) $(wildcard src/tests/bugs/*.fa)
RELEASE_FILES = $(RELEASE_SOURCE) $(RELEASE_TESTS) $(RELEASE_MAKE)  germline/get-germline germline/split-from-imgt.py  doc/README doc/LICENSE
RELEASE_ARCHIVE = vidjil-$(RELEASE_TAG).tgz

CURRENT_DIR = vidjil
RELEASE_FILES_VID = $(addprefix $(CURRENT_DIR)/, $(RELEASE_FILES))


# make distrib RELEASE_TAG=2013.04alpha
distrib:	
	$(info ==== Release $(RELEASE_TAG) ====)

	# Tag the release
	git tag -f release-$(RELEASE_TAG)
	echo '#define RELEASE_TAG "$(RELEASE_TAG)"' > $(RELEASE_H)

	mkdir -p release 
	rm -rf release/$(RELEASE_ARCHIVE) release/$(CURRENT_DIR)
	cd .. ; tar cvfz  $(CURRENT_DIR)/release/$(RELEASE_ARCHIVE) $(RELEASE_FILES_VID)

	# Untag the source
	rm $(RELEASE_H) ; touch $(RELEASE_H)

	# Check archive
	cd release ; tar xvfz $(RELEASE_ARCHIVE)
	cd release/$(CURRENT_DIR) ; make
	cd release/$(CURRENT_DIR) ; make germline
	cd release/$(CURRENT_DIR) ; make data
	cd release/$(CURRENT_DIR) ; make test




