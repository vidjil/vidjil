
all:
	make -C src

test: all
	make -C src/tests 
	make should

should:
	./vidjil -G germline/IGH -D data/Stanford_S22.fasta > src/tests/stanford.log
	src/tests/should-to-tap.sh
	cat src/tests/should-to-tap.sh.tap

clean:
	make -C src clean

.PHONY: all test should clean distrib

RELEASE_H = src/release.h
RELEASE_SOURCE = $(wildcard src/*.cpp) $(wildcard src/*.h)  $(wildcard src/core/*.cpp) $(wildcard src/core/*.h)  
RELEASE_FILES = $(RELEASE_SOURCE) ./Makefile src/Makefile germline/get-germline doc/README doc/LICENSE
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

