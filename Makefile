

VIDJIL_ALGO_SRC = algo/
VIDJIL_SERVER_SRC = server/

all:
	make -C $(VIDJIL_ALGO_SRC)

test: all
	make -C $(VIDJIL_SERVER_SRC) tests
	make -C $(VIDJIL_ALGO_SRC)/tests 
	make should


should: all
	@echo
	@echo "*** Launching .should_get tests..."
	make -C $(VIDJIL_ALGO_SRC)/tests should
	@echo "*** All .should_get tests passed"

data germline: %:
	make -C $@

clean:
	make -C $(VIDJIL_ALGO_SRC) clean

cleanall: clean
	make -C data $^
	make -C germline $^

.PHONY: all test should clean cleanall distrib data germline

RELEASE_TAG="notag"
RELEASE_H = $(VIDJIL_ALGO_SRC)/release.h
RELEASE_SOURCE = $(wildcard $(VIDJIL_ALGO_SRC)/*.cpp) $(wildcard $(VIDJIL_ALGO_SRC)/*.h)  $(wildcard $(VIDJIL_ALGO_SRC)/core/*.cpp)  $(wildcard $(VIDJIL_ALGO_SRC)/tests/*.cpp) $(wildcard $(VIDJIL_ALGO_SRC)/core/*.h)  $(wildcard $(VIDJIL_ALGO_SRC)/tests/*.h)  
RELEASE_MAKE = ./Makefile  $(VIDJIL_ALGO_SRC)/Makefile $(VIDJIL_ALGO_SRC)/tests/Makefile germline/Makefile data/Makefile
RELEASE_TESTS =  data/get-sequences $(wildcard data/*.fa) $(wildcard data/*.fq) $(VIDJIL_ALGO_SRC)/tests/should-to-tap.sh $(wildcard $(VIDJIL_ALGO_SRC)/tests/*.should_get) $(wildcard $(VIDJIL_ALGO_SRC)/tests/bugs/*.fa)  $(wildcard $(VIDJIL_ALGO_SRC)/tests/bugs/*.should_get)
RELEASE_FILES = $(RELEASE_SOURCE) $(RELEASE_TESTS) $(RELEASE_MAKE)  germline/get-germline germline/split-from-imgt.py  doc/README doc/LICENSE
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



