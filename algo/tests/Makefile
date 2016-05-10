CXX?=g++
INCLUDE=-I ..
OPTIM=-g -O0 $(COVERAGE)
override CXXFLAGS += -std=c++11 -W -Wall $(OPTIM)
LDLIBS=-lz
SRC= unit-tests/tests.cpp
EXEC=$(SRC:.cpp=)
OBJ=$(SRC:.cpp=.o)
OTHER_SRC=$(wildcard *.cpp)
LIB=../core/vidjil.a ../lib/lib.a
SHOULD=$(wildcard should-get-tests/*.should-get)
SHOULD_LOG=$(SHOULD:.should-get=.tap)
SHOULD_VDJ=$(wildcard should-vdj-tests/*.should-vdj.fa)
SHOULD_LOCUS=$(wildcard should-vdj-tests/*.should-locus.fa)
REPORTS_PATH := $(patsubst %/Makefile,%,$(abspath $(lastword $(MAKEFILE_LIST))))/../../reports
VALGRIND=valgrind -v --tool=memcheck --leak-check=full --show-reachable=yes --undef-value-errors=yes --track-origins=yes --xml=yes --xml-file="$$(mktemp "$(REPORTS_PATH)/valgrind.xml.XXXXXX")"

#should-vdj that should not be published in our public curated dataset (just internal tests)
EXCLUDE_SHOULD_VDJ=bug20151006-rc.should-vdj.fa cdr3-indels.should-vdj.fa ext-nucleotides-N.should-vdj.fa segment_simul.should-vdj.fa trd-dd2-dd3.should-vdj.fa trd-dd2up-dd3down.should-vdj.fa igh-vdj.should-vdj.fa Demo-X5.should-vdj.fa
SHOULD_VDJ_ARCHIVE:=$(filter-out $(addprefix should-vdj-tests/,$(EXCLUDE_SHOULD_VDJ)), $(SHOULD_VDJ))

DATE=$(shell date +%Y-%m-%d--%H:%M:%S)
SNAPSHOTS_DIR=./snapshots
SNAPSHOT=$(SNAPSHOTS_DIR)/snapshot-log--$(DATE)

.PHONY: all force clean forcedep

test: all
	@echo
	@echo "*** Launching unit tests..."
	./unit-tests/tests
	cat ./unit-tests/tests.cpp.tap
	@echo "*** All unit tests passed"

all: core $(EXEC)
	@echo "All tests compiled."

snapshot:
	mkdir -p $(SNAPSHOTS_DIR)
	grep . should-get-tests/*.log should-vdj-tests/*.log > $(SNAPSHOT)
	touch snapshot-last ; mv snapshot-last snapshot-prev
	ln -s $(SNAPSHOT) snapshot-last
	diff -I "20..-..-.." snapshot-prev snapshot-last | diffstat -cC

should: vidjil $(SHOULD_LOG)

shouldvdj_if_python:
	if python ../../tools/check_python_version.py ; \
	then $(MAKE) shouldlocus_and_vdj ; \
	else echo "!!! Bad python version, we skip .should-vdj.fa tests..." ; \
	fi

shouldlocus_and_vdj: vidjil
	@echo "*** Launching .should-vdj-fa tests..."
	python should-vdj-to-tap.py -2q -r $(SHOULD_VDJ) $(SHOULD_LOCUS)
	$(MAKE) shouldvdj_with_rc
	@echo "*** All .should-vdj.fa tests passed"

shouldvdj:
	python should-vdj-to-tap.py $(SHOULD_VDJ)

shouldvdj_with_rc:
	python should-vdj-to-tap.py -r $(SHOULD_VDJ)

shouldvdj_with_rc_merged:
	cat $(SHOULD_VDJ) > should-vdj-tests/should-vdj.merged.fa
	python should-vdj-to-tap.py -r should-vdj-tests/should-vdj.merged.fa

shouldvdj_archive: should-vdj.zip
should-vdj.zip: $(SHOULD_VDJ_ARCHIVE)
	$(eval tmpdir := $(shell mktemp -d))
	mkdir $(tmpdir)/should-vdj
	cp --parents --preserve $(SHOULD_VDJ_ARCHIVE) $(tmpdir)
	sed -ri 's/\s*BUG//' $(tmpdir)/should-vdj-tests/*
	cwd=`pwd` && cd $(tmpdir) && zip $$cwd/$@ $(SHOULD_VDJ_ARCHIVE)
	rm -rf $(tmpdir)

%.tap: %.should-get force
	./should-to-tap.sh $<

valgrind_should:
	$(MAKE) -C $(REPORTS_PATH) clean_valgrind
	LAUNCHER="$(VALGRIND)" $(MAKE) should

valgrind_%:
	LAUNCHER="$(VALGRIND)" $(MAKE) $(patsubst valgrind_%,%,$@)

valgrind_tests: vidjil ./unit-tests/tests
	$(VALGRIND) ./unit-tests/tests

$(EXEC): % : %.o $(LIB) 
	$(CXX) -o $@ $< $(LIB) $(LDLIBS) $(LDFLAGS) $(CXXFLAGS)


../core.a: core

vidjil:
	$(MAKE) -C ../ clean
	$(MAKE) -C ../ OPTIM="$(OPTIM)"

core:
	$(MAKE) -C ../core

%.o: %.cpp $(OTHER_SRC)
	$(CXX) -o $@ $(INCLUDE) -c $< $(CXXFLAGS)

clean:
	rm -f $(OBJ) $(EXEC)
cleancoverage:
	rm -f *.gcda *.gcno *.gcov
cleantests:
	rm -f *.tap *.log should-vdj-tests/*.tap should-vdj-tests/*.log
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

