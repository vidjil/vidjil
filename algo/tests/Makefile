CXX=g++
INCLUDE=-I ..
OPTIM=-g -O0 $(COVERAGE)
override CXXFLAGS += -std=c++11 -W -Wall $(OPTIM)
LDLIBS=-lz
SRC= tests.cpp
EXEC=$(SRC:.cpp=)
OTHER_SRC=$(wildcard *.cpp)
LIB=../core/vidjil.a ../lib/lib.a
SHOULD=$(wildcard *.should_get)
SHOULD_LOG=$(SHOULD:.should_get=.tap)
SHOULD_VDJ=$(wildcard should-vdj-tests/*.should-vdj.fa)
SHOULD_LOCUS=$(wildcard should-vdj-tests/*.should-locus.fa)
REPORTS_PATH := $(patsubst %/Makefile,%,$(abspath $(lastword $(MAKEFILE_LIST))))/../../reports
VALGRIND=valgrind -v --tool=memcheck --leak-check=full --show-reachable=yes --undef-value-errors=yes --track-origins=yes --xml=yes --xml-file="$$(mktemp "$(REPORTS_PATH)/valgrind.xml.XXXXXX")"

DATE=$(shell date +%Y-%m-%d:%H:%M:%S)
SNAPSHOT=snapshot-log-$(DATE)

.PHONY: all force clean forcedep

test: all
	@echo
	@echo "*** Launching unit tests..."
	./tests
	cat tests.cpp.tap
	@echo "*** All unit tests passed"

all: core $(EXEC)
	@echo "All tests compiled."

snapshot:
	grep . *.log should-vdj-tests/*.log > $(SNAPSHOT)
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

%.tap: %.should_get force
	./should-to-tap.sh $<

valgrind_should:
	$(MAKE) -C $(REPORTS_PATH) clean_valgrind
	LAUNCHER="$(VALGRIND)" $(MAKE) should

valgrind_%:
	LAUNCHER="$(VALGRIND)" $(MAKE) $(patsubst valgrind_%,%,$@)

valgrind_tests: vidjil tests
	$(VALGRIND) ./tests

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
	rm -f *.o $(EXEC)
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

