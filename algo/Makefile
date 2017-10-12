CXX?=g++
OPTIM=-O2 -DNDEBUG  $(COVERAGE) $(DEBUG)
override CXXFLAGS += -W -Wall -std=c++11 $(OPTIM)

## inspired from http://stackoverflow.com/questions/399850/best-compiler-warning-level-for-c-c-compilers/401276
PARANOID= -Wall -Weffc++ -pedantic  \
    -Wextra -Waggregate-return -Wcast-align \
    -Wcast-qual  -Wchar-subscripts  -Wcomment -Wconversion \
    -Wdisabled-optimization \
    -Wfloat-equal  -Wformat  -Wformat=2 \
    -Wformat-nonliteral -Wformat-security  \
    -Wformat-y2k \
    -Wimplicit  -Wimport  -Winit-self  -Winline \
    -Winvalid-pch   -Wlong-long -Wmissing-braces \
    -Wmissing-field-initializers -Wmissing-format-attribute   \
    -Wmissing-include-dirs -Wmissing-noreturn \
    -Wpacked  -Wpadded -Wparentheses  -Wpointer-arith \
    -Wredundant-decls -Wreturn-type \
    -Wsequence-point  -Wshadow -Wsign-compare  -Wstack-protector \
    -Wstrict-aliasing -Wstrict-aliasing=2 -Wswitch  -Wswitch-default \
    -Wswitch-enum -Wtrigraphs  -Wuninitialized \
    -Wunknown-pragmas  -Wunreachable-code -Wunused \
    -Wunused-function  -Wunused-label  -Wunused-parameter \
    -Wunused-value  -Wunused-variable  -Wvariadic-macros \
    -Wvolatile-register-var  -Wwrite-strings
LDLIBS=-lm -lz
EXEC=vidjil
MAINCORE=$(wildcard *.cpp)
LIBCORE=core/vidjil.a lib/lib.a

BINDIR=../
CGIDIR=../browser/cgi/
TOOLDIR=tools/

VIDJIL=$(BINDIR)$(EXEC)
ALIGN_CGI=$(CGIDIR)align.cgi
SIMILARITY_CGI=$(CGIDIR)similarity.cgi
SIMILARITY_TOOL=$(TOOLDIR)similarity

CREATE_VERSION_GIT_H := $(shell test -x ./create-git-version-h.sh && ./create-git-version-h.sh)

TEE = python ../tools/tee.py -v

.PHONY: all core lib clean forcedep

all: $(VIDJIL) $(ALIGN_CGI) $(SIMILARITY_CGI) $(SIMILARITY_TOOL)
	$(MAKE) -C $(TOOLDIR)

base: $(VIDJIL)

static:
	$(MAKE) all LDFLAGS="-static -static-libstdc++"

###

paranoid: clean
	$(MAKE) vidjil OPTIM="$(PARANOID)"

###

kmers: cleankmers
	$(MAKE) CONFIG="-DDEBUG_KMERS"

nokmers: cleankmers
	$(MAKE)

cleankmers:
	rm -f vidjil.o core/windowExtractor.o core/segment.o

###

spaced: cleanspaced
	$(MAKE)

nospaced: cleanspaced
	$(MAKE) CONFIG="-DNO_SPACED_SEEDS"

cleanspaced:
	rm -f vidjil.o core/tools.o

###

$(ALIGN_CGI): cgi/align.o $(LIBCORE)
	mkdir -p $(CGIDIR)
	$(MAKE) -C core OPTIM="$(OPTIM)"
	$(CXX) -o $@ $^ $(LDFLAGS) $(LDLIBS) $(CXXFLAGS)

$(SIMILARITY_CGI): cgi/similarity.o $(LIBCORE)
	mkdir -p $(CGIDIR)
	$(MAKE) -C core OPTIM="$(OPTIM)"
	$(CXX) -o $@ $^ $(LDFLAGS) $(LDLIBS) $(CXXFLAGS)

$(SIMILARITY_TOOL): cgi/similarity.o $(LIBCORE)
	mkdir -p $(TOOLDIR)
	$(MAKE) -C core OPTIM="$(OPTIM)"
	$(CXX) -o $@ $^ $(LDFLAGS) $(LDLIBS) $(CXXFLAGS)

###

debug:
	$(MAKE) clean
	$(MAKE) DEBUG="-ggdb"

$(VIDJIL): $(BINDIR)%: %.o $(LIBCORE)
	$(MAKE) -C core OPTIM="$(OPTIM)"
	$(MAKE) -C lib OPTIM="$(OPTIM)"
	$(CXX) -o $@ $^ $(LDFLAGS) $(LDLIBS) $(CXXFLAGS)

###
# Subdirectories
###

core/%.a: FORCE
	$(MAKE) -C core $(notdir $@)

lib/%.a: FORCE
	$(MAKE) -C lib $(notdir $@)

clean:
	$(MAKE) -C core $@
	$(MAKE) -C lib $@
	rm -f *.o cgi/*.o
	cd $(BINDIR) ; rm -f $(EXEC)
	$(MAKE) -C tests $@

cleancoverage: clean
	rm -f *.gcda *.gcno *.gcov
	$(MAKE) -C core cleancoverage
	$(MAKE) -C lib cleancoverage

cleanall: cleancoverage
	$(MAKE) -C tests cleanall

###
# Tests
###

test:
	$(MAKE) -C tests cleantests
	$(TEE) '$(MAKE) COVERAGE="$(COVERAGE)" unit' tests/out-unit.log
	$(MAKE) functional
	$(TEE) '$(MAKE) -C .. test_tools_if_python'        tests/out-tools.log
	@echo
	@echo "*** All tests passed. Congratulations !"
	@echo
	$(MAKE) -C tests snapshot_success
	$(MAKE) -C tests mark_failed_tests_as_todo

snapshot_diff:
	$(MAKE) -C tests snapshot_diff

snapshot_diff_current:
	$(MAKE) -C tests snapshot_diff_current

unit: all
	@echo "*** Launching unit tests..."
	$(MAKE) COVERAGE="$(COVERAGE_OPTION)" -C tests
	@echo "*** All unit tests passed"

functional: all
	$(TEE) '$(MAKE) should'      tests/out-should-get.log
	$(TEE) '$(MAKE) shouldvdj'   tests/out-should-vdj.log

should: all
	@echo
	@echo "*** Launching .should_get tests..."
	$(MAKE) COVERAGE="$(COVERAGE_OPTION)" -C tests should
	@echo "*** All .should_get tests passed"

shouldvdj: all
	@echo
	$(MAKE) COVERAGE="$(COVERAGE_OPTION)" -C tests shouldvdj_if_python


valgrind_unit:
	$(MAKE) -C tests valgrind_tests

valgrind_should:
	$(MAKE) -C tests valgrind_should



### Code coverage

coverage: unit_coverage should_coverage

unit_coverage: clean
	$(MAKE) COVERAGE=1 unit
should_coverage: clean
	$(MAKE) COVERAGE=1 functional

### Reports with gcovr

unit_gcovr: unit_coverage
	mkdir -p reports
	which gcovr > /dev/null && (gcovr -r . -e tests/ --xml > ../reports/unit_coverage.xml) || echo "gcovr is needed to generate a full report"
should_gcovr: should_coverage
	mkdir -p reports
	which gcovr > /dev/null && (gcovr -r . -e tests/ --xml > ../reports/should_coverage.xml) || echo "gcovr is needed to generate a full report"

### Upload to coveralls.io

unit_coveralls:
	coveralls $(COVERALLS_OPTIONS) --exclude release --exclude lib --exclude tests --exclude tools --exclude tests --exclude ../tools --exclude lib --gcov-options '\-lp'
should_coveralls:
	coveralls $(COVERALLS_OPTIONS) --exclude release --exclude lib --exclude tests --exclude tools --exclude tests --exclude ../tools --exclude lib --gcov-options '\-lp' -r algo


### cppcheck

cppcheck:
	mkdir -p reports
	cppcheck --enable=all --xml . 2>! reports/cppcheck.xml

###
# Tests - generated
###

shouldvdj_generated_kmer: base
	@echo
	@echo "*** Launching generated .should-vdj-fa tests (and accepts errors) -- Kmer"
	-cd tests/data/gen ; python ../../should-vdj-to-tap.py -2q *.should-vdj.fa
	@echo "*** Generated .should-vdj.fa tests finished -- Kmer"
	python tests/tap-stats.py tests/data/gen/0-*.2.tap
	python tests/tap-stats.py tests/data/gen/5-*.2.tap

shouldvdj_generated_fine: base
	@echo
	@echo "*** Launching generated .should-vdj-fa tests (and accepts errors) -- Fine"
	-cd tests/data/gen ; python ../../should-vdj-to-tap.py *.should-vdj.fa
	@echo "*** Generated .should-vdj.fa tests finished -- Fine"
	python tests/tap-stats.py tests/data/gen/0-*.1.tap
	python tests/tap-stats.py tests/data/gen/5-*.1.tap

###
# dep.mk
###

forcedep:
	$(CXX) $(CXXFLAGS) -M $(MAINCORE) > dep.mk
	$(MAKE) -C core forcedep
	$(MAKE) -C lib forcedep

FORCE:

DEP=$(wildcard dep.mk)

ifeq (${DEP},)
$(shell	$(CXX) $(CXXFLAGS) -M $(MAINCORE) > dep.mk)
endif
include dep.mk

