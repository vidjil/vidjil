CXX?=g++
INCLUDE=-I ..
ifeq ($(CXXFLAGS), )
  CXXFLAGS := -W -Wall -std=c++11 -O2
endif
CXXFLAGS := $(filter-out -DNDEBUG,$(CXXFLAGS))
export CXXFLAGS
LDLIBS=-lz
SRC= unit-tests/tests.cpp
EXEC=$(SRC:.cpp=)
OBJ=$(SRC:.cpp=.o)
OTHER_SRC=$(wildcard unit-tests/*.cpp)
LIB=../core/vidjil.a ../lib/lib.a
SHOULD=$(wildcard should-get-tests/*.should) $(wildcard bugs/*.should)
SHOULD_LOG=$(SHOULD:.should=.tap)
SHOULD_VDJ=$(wildcard should-vdj-tests/*.should-vdj.fa)
SHOULD_VDJ_VDJ=$(SHOULD_VDJ:.should-vdj.fa=.1.vdj)
SHOULD_LOCUS=$(wildcard should-vdj-tests/*.should-locus.fa)
SHOULD_VDJ_TO_TAP=time python -u should-vdj-to-tap.py
REPORTS_PATH := $(patsubst %/Makefile,%,$(abspath $(lastword $(MAKEFILE_LIST))))/../../reports
VALGRIND=valgrind
VALGRIND_TOOLS= --tool=memcheck --leak-check=full --show-reachable=yes --trace-children=yes
VALGRIND_OUTPUT_XML=--xml=yes --xml-file='$(REPORTS_PATH)/valgrind.xml.%p'
VALGRIND_OUTPUT=--error-exitcode=1

SHOULD_TIMEOUT=140
SHOULD_TIMEOUT_VALGRIND=500

ifeq ($(XML_OUTPUT), 1)
  VALGRIND_OUTPUT=$(VALGRIND_OUTPUT_XML)
endif

VALGRIND_CMD=$(VALGRIND) $(VALGRIND_TOOLS) $(VALGRIND_OUTPUT)

#should-vdj that should not be published in our public curated dataset (just internal tests)
EXCLUDE_SHOULD_VDJ=bug20151006-rc.should-vdj.fa cdr3-indels.should-vdj.fa ext-nucleotides-N.should-vdj.fa segment_simul.should-vdj.fa trd-dd2-dd3.should-vdj.fa trd-dd2up-dd3down.should-vdj.fa igh-vdj.should-vdj.fa Demo-X5.should-vdj.fa
SHOULD_VDJ_ARCHIVE:=$(filter-out $(addprefix should-vdj-tests/,$(EXCLUDE_SHOULD_VDJ)), $(SHOULD_VDJ))

DATE=$(shell date +%Y-%m-%d--%H:%M:%S)
GIT_SHA1=$(shell git rev-parse --short HEAD || echo 'nogit')
SNAPSHOTS_DIR=./snapshots
SNAPSHOT=$(SNAPSHOTS_DIR)/snapshot-log--$(DATE)--$(GIT_SHA1)
SNAPSHOT_CURRENT=$(SNAPSHOT)--current

.PHONY: all force clean forcedep

test: all
	@echo
	@echo "*** Launching unit tests..."
	./unit-tests/tests
	cat ./unit-tests/tests.cpp.tap
	@echo "*** All unit tests passed"

all: $(EXEC)
	@echo "All tests compiled."

snapshot:
	mkdir -p $(SNAPSHOTS_DIR)
	-grep --no-messages . out-*.log should-get-tests/*.log should-vdj-tests/*.log > $(SNAPSHOT)

snapshot_success: snapshot
	touch snapshot-last ; mv snapshot-last snapshot-prev
	ln -s $(SNAPSHOT) snapshot-last
	-(which diffstat && make snapshot_diff | diffstat -cC)

# Diff between the two last succeeded snasphots
snapshot_diff:
	-diff -u -I ".*20..-..-...*" snapshot-prev snapshot-last

# Diff between the last succeeded snasphot and the (possibly failed) current snapshot
snapshot_diff_current:
	-make snapshot SNAPSHOT="$(SNAPSHOT_CURRENT)"
	-diff -u -I ".*20..-..-...*" snapshot-last $(SNAPSHOT_CURRENT)


should: vidjil
	time python3 should.py --timeout $(SHOULD_TIMEOUT) --xml $(SHOULD)

shouldvdj_if_python:
	if python ../../tools/check_python_version.py ; \
	then $(MAKE) shouldlocus_and_vdj ; \
	else echo "!!! Bad python version, we skip .should-vdj.fa tests..." ; \
	fi

shouldlocus: vidjil
	$(SHOULD_VDJ_TO_TAP) -2q -r $(SHOULD_VDJ) $(SHOULD_LOCUS)

shouldlocus_and_vdj: vidjil
	@echo "*** Launching .should-vdj-fa tests..."
	$(MAKE) shouldlocus
	$(MAKE) shouldvdj_with_rc
	@echo "*** All .should-vdj.fa tests passed"

shouldvdj_no_relaunch:
	$(SHOULD_VDJ_TO_TAP) $(SHOULD_VDJ_VDJ)

shouldvdj:
	$(SHOULD_VDJ_TO_TAP) $(SHOULD_VDJ)

shouldvdj_with_rc:
	$(SHOULD_VDJ_TO_TAP) -r $(SHOULD_VDJ)

shouldvdj_with_rc_merged:
	awk 1  $(SHOULD_VDJ) > should-vdj-tests/should-vdj.merged.fa
	$(SHOULD_VDJ_TO_TAP) -r should-vdj-tests/should-vdj.merged.fa

# When the global test suite is passing, individual failed tests (tagged with BUG or BUG-LOCUS in the *.should-vdj.fa files)
# can be marked as 'TODO' to make continuous integration happy
mark_failed_tests_as_todo:
	-sed -e "s/^\(not ok [0-9]*\) /\1 # TODO ##/" -i".bak" */*.tap
	rm -f */*.tap.bak

curatedvdj_archive: curated-vdj.zip
curated-vdj.zip: $(SHOULD_VDJ_ARCHIVE)
	$(eval tmpdir := $(shell mktemp -d))
	mkdir $(tmpdir)/curated-vdj
	cp --preserve $(SHOULD_VDJ_ARCHIVE) $(tmpdir)/curated-vdj
	sed -r 's/\s*BUG[A-Z-]+//' -i $(tmpdir)/curated-vdj/*
	for file in $(tmpdir)/curated-vdj/*; do mv $$file `echo $$file | sed 's/should/curated/'`; done
	cwd=`pwd` && cd $(tmpdir) && zip $$cwd/$@ curated-vdj/*
	rm -rf $(tmpdir)

%.tap: %.should-get force
	./should-to-tap.sh $<

valgrind_should: vidjil
	$(MAKE) -C "$(REPORTS_PATH)" clean_valgrind
	time python3 should.py --timeout $(SHOULD_TIMEOUT_VALGRIND) --launcher "$(VALGRIND_CMD)" --extra=--clean-memory $(SHOULD)

valgrind_%:
	LAUNCHER="$(VALGRIND_CMD)" $(MAKE) $(patsubst valgrind_%,%,$@)

valgrind_tests: vidjil ./unit-tests/tests
	$(VALGRIND_CMD) ./unit-tests/tests

$(EXEC): % : core %.o $(LIB) 
	$(CXX) -o $@ $@.o $(LIB) $(LDLIBS) $(LDFLAGS) $(CXXFLAGS)


../%.a:
	$(MAKE) -C $(dir $@) $(notdir $@)

vidjil:
	$(MAKE) -C ../ clean
	$(MAKE) -C ../ 2>&1 | tee make-vidjil-algo.log

core:
	$(MAKE) -C ../core

%.o: %.cpp $(OTHER_SRC)
	$(CXX) -o $@ $(INCLUDE) -c $< $(CXXFLAGS)

clean:
	rm -f $(OBJ) $(EXEC)
cleancoverage:
	rm -f *.gcda *.gcno *.gcov
cleantests:
	rm -f *.tap *.log should-vdj-tests/*.tap should-vdj-tests/*.log should-get-tests/*.tap should-get-tests/*.log
	rm -rf out/

cleanall: clean cleancoverage cleantests

forcedep:
	$(CXX) $(CXXFLAGS) $(INCLUDE) -M $(SRC) > dep.mk

force:

DEP=$(wildcard dep.mk)

ifeq (${DEP},)
$(shell	$(CXX) $(CXXFLAGS) $(INCLUDE) -M $(SRC) > dep.mk)
endif
include dep.mk

