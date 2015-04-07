CC=g++
INCLUDE=-I ..
OPTIM=-g -O0 $(COVERAGE)
override CXXFLAGS += -W -Wall $(OPTIM)
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

.PHONY: all force clean forcedep

test: all
	@echo
	@echo "*** Launching unit tests..."
	./tests
	cat tests.cpp.tap
	@echo "*** All unit tests passed"

all: core $(EXEC)
	@echo "All tests compiled."

should: vidjil $(SHOULD_LOG)

shouldvdj: vidjil
	python should-vdj-to-tap.py -2q $(SHOULD_VDJ) $(SHOULD_LOCUS)
	python should-vdj-to-tap.py $(SHOULD_VDJ)

%.tap: %.should_get force
	./should-to-tap.sh $<

valgrind_should:
	make -C $(REPORTS_PATH) clean_valgrind
	LAUNCHER="$(VALGRIND)" make should

valgrind_%:
	LAUNCHER="$(VALGRIND)" make $(patsubst valgrind_%,%,$@)

valgrind_tests: vidjil tests
	$(VALGRIND) ./tests

$(EXEC): % : %.o $(LIB) 
	$(CC) -o $@ $< $(LIB) $(LDLIBS) $(LDFLAGS) $(CXXFLAGS)


../core.a: core

vidjil:
	make -C ../ clean
	make -C ../ OPTIM="$(OPTIM)"

core:
	make -C ../core

%.o: %.cpp $(OTHER_SRC)
	$(CC) -o $@ $(INCLUDE) -c $< $(CXXFLAGS)

clean:
	rm -f *.o $(EXEC)
cleancoverage:
	rm -f *.gcda *.gcno *.gcov
cleantests:
	rm -f *.tap *.log should-vdj-tests/*.tap should-vdj-tests/*.log
	rm -rf out/

cleanall: clean cleancoverage cleantests

forcedep:
	g++ $(INCLUDE) -M $(SRC) > dep.mk

force:

DEP=$(wildcard dep.mk)

ifeq (${DEP},)
$(shell	g++ $(INCLUDE) -M $(SRC) > dep.mk)
endif
include dep.mk

