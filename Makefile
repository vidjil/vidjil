
all:
	make -C src

test: all
	make -C src/tests 
	make should

should: all
	src/tests/should-to-tap.sh src/tests/stanford.should_get
	src/tests/should-to-tap.sh src/tests/clones_S22.should_get
	src/tests/should-to-tap.sh src/tests/segment_S22.should_get
	src/tests/should-to-tap.sh src/tests/segment_lec.should_get
	src/tests/should-to-tap.sh src/tests/segment_simul.should_get

clean:
	make -C src clean

.PHONY: all test should clean distrib

RELEASE_H = src/release.h
RELEASE_SOURCE = $(wildcard src/*.cpp) $(wildcard src/*.h)  $(wildcard src/core/*.cpp)  $(wildcard src/tests/*.cpp) $(wildcard src/core/*.h)  $(wildcard src/tests/*.h)  
RELEASE_FILES = $(RELEASE_SOURCE) ./Makefile src/Makefile src/tests/Makefile germline/get-germline  germline/split-from-imgt.py data/get-sequences data/*.fa data/*.fq doc/README doc/LICENSE
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
	rm -f release/$(RELEASE_ARCHIVE)
	cd .. ; tar cvfz  $(CURRENT_DIR)/release/$(RELEASE_ARCHIVE) $(RELEASE_FILES_VID)

	# Untag the source
	rm $(RELEASE_H) ; touch $(RELEASE_H)

	# Check archive
	cd release ; tar xvfz $(RELEASE_ARCHIVE)
	cd release/$(CURRENT_DIR) ; make
	cd release/$(CURRENT_DIR)/germline ; ./get-germline

