CXX?=g++

ifeq (${COVERAGE},1)
	COVERAGE_OPTION=--coverage
else
	COVERAGE_OPTION=
endif

ifeq ($(CXXFLAGS), )
  CXXFLAGS := -W -Wall -std=c++11 -O2 -DNDEBUG
endif
override CXXFLAGS += $(COVERAGE_OPTION) $(DEBUG)
ifeq ($(LDFLAGS),)
  LDFLAGS := $(COVERAGE_OPTION)
endif
COV_OUTFILE?=lcov.out
BASE_PATH=$(dir $(abspath .))

export CXXFLAGS
export LDFLAGS
export CXX

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
MAIN=vidjil
EXEC=vidjil-algo
MAINCORE=$(wildcard *.cpp)
LIBCORE=core/vidjil.a lib/lib.a

BINDIR=../
CGIDIR=../tools/
TOOLDIR=tools/

VIDJIL=$(BINDIR)$(EXEC)
ALIGN_CGI=$(CGIDIR)align.cgi
SIMILARITY_CGI=$(CGIDIR)similarity.cgi
SIMILARITY_TOOL=$(TOOLDIR)similarity

CREATE_VERSION_GIT_H := $(shell test -x ./create-git-version-h.sh && ./create-git-version-h.sh)

TEE = python ../tools/tee.py -v

.PHONY: all core lib clean forcedep gcovr_reports

all: $(VIDJIL) $(ALIGN_CGI) $(SIMILARITY_CGI) $(SIMILARITY_TOOL)
	$(MAKE) -C $(TOOLDIR)

base: $(VIDJIL)

static:
	$(MAKE) all LDFLAGS="-static -static-libstdc++"

###

paranoid: clean
	$(MAKE) vidjil CXXFLAGS="$(CXXFLAGS) $(PARANOID)"

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
	$(MAKE) -C core
	$(CXX) -o $@ $^ $(LDFLAGS) $(LDLIBS) $(CXXFLAGS)

$(SIMILARITY_CGI): cgi/similarity.o $(LIBCORE)
	mkdir -p $(CGIDIR)
	$(MAKE) -C core
	$(CXX) -o $@ $^ $(LDFLAGS) $(LDLIBS) $(CXXFLAGS)

$(SIMILARITY_TOOL): cgi/similarity.o $(LIBCORE)
	mkdir -p $(TOOLDIR)
	$(MAKE) -C core
	$(CXX) -o $@ $^ $(LDFLAGS) $(LDLIBS) $(CXXFLAGS)

###

debug:
	$(MAKE) clean
	$(MAKE) DEBUG="-ggdb"

$(VIDJIL): $(BINDIR)%: $(MAIN).o $(LIBCORE)
	$(MAKE) -C core
	$(MAKE) -C lib
	$(CXX) -o $@ $^ $(LDFLAGS) $(LDLIBS)

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
	$(TEE) '$(MAKE) unit' tests/out-unit.log
	$(MAKE) functional
	@echo
	@echo "*** All tests passed. Congratulations !"
	@echo
	$(MAKE) -C tests snapshot_success
	$(MAKE) -C tests mark_failed_tests_as_todo

snapshot_diff:
	$(MAKE) -C tests snapshot_diff

snapshot_diff_current:
	$(MAKE) -C tests snapshot_diff_current

unit:
	$(MAKE) CXXFLAGS="$(filter-out -DNDEBUG, $(CXXFLAGS))" all
	@echo "*** Launching unit tests..."
	$(MAKE) -C tests
	@echo "*** All unit tests passed"

functional:
	$(TEE) '$(MAKE) should'      tests/out-should-get.log
	$(TEE) '$(MAKE) shouldvdj'   tests/out-should-vdj.log

should:
	$(MAKE) CXXFLAGS="$(filter-out -DNDEBUG, $(CXXFLAGS))" all
	@echo
	@echo "*** Launching .should_get tests..."
	$(MAKE) -C tests should
	@echo "*** All .should_get tests passed"

shouldvdj:
	@echo
	$(MAKE) CXXFLAGS="$(filter-out -DNDEBUG, $(CXXFLAGS))" all
	$(MAKE) -C tests shouldvdj_if_python


valgrind_unit:
	$(MAKE) -C tests valgrind_tests

valgrind_should:
	$(MAKE) -C tests valgrind_should



### Code coverage

coverage: unit_coverage should_coverage

unit_coverage: cleancoverage
	$(MAKE) COVERAGE=1 unit
	$(MAKE) COV_OUTFILE=lcov_test_unit gencov
should_coverage: cleancoverage
	$(MAKE) COVERAGE=1 should
	$(MAKE) COV_OUTFILE=lcov_test_should gencov
shouldvdj_coverage: cleancoverage
	$(MAKE) COVERAGE=1 shouldvdj
	$(MAKE) COV_OUTFILE=lcov_test_shouldvdj gencov
functional_coverage: cleancoverage
	$(MAKE) COVERAGE=1 functional
	$(MAKE) COV_OUTFILE=lcov_test_functional gencov

gencov:
	which lcov > /dev/null || exit 0
	lcov --rc geninfo_adjust_src_path="$(BASE_PATH)" -d . -c -o $(COV_OUTFILE)
	lcov  --remove $(COV_OUTFILE) '/usr/*' '*algo/tests/*' '*algo/lib/*' '*algo/tools/*' -o $(COV_OUTFILE).filtered

### Reports with lcov

lcov_reports:
	mkdir -p reports
	which lcov > /dev/null && (lcov $(addprefix -a ,$(wildcard lcov*.filtered)) | sed 's_^SF:algo_SF:'"$(BASE_PATH)"'/algo_' > lcov_filtered_total.out && genhtml --branch-coverage --legend --output-directory reports/ lcov_filtered_total.out ) || echo "gcovr is needed to generate a full report"

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
# Release
###

# $(MAKE) release RELEASE_TAG=2013.04alpha

RELEASE_TAG = notag
RELEASE_H = release.h
GIT_VERSION_H = git-version.h

RELEASES_DIR = releases/
RELEASE_NAME = vidjil-algo-$(RELEASE_TAG)
RELEASE_ARCHIVE_TAR = $(RELEASE_NAME).tar
RELEASE_ARCHIVE_TGZ = $(RELEASE_NAME).tar.gz
RELEASE_DIR_TMP = releases/tmp

RELEASE_ALGO = src/
RELEASE_TOOLS = $(wildcard ../tools/*.py)
RELEASE_MAKE = ../tools/tests/Makefile ../doc/Makefile
RELEASE_TESTS = ../doc/vidjil-format.md $(wildcard ../doc/analysis-example.vidjil) $(wildcard ../tools/tests/*.should_get) ../tools/should.py  ../tools/diff_json.sh ../demo/get-sequences ../demo/Demo-X5.fa ../demo/Makefile
RELEASE_GERMLINES = ../germline/Makefile ../germline/germline_id ../germline/get-saved-germline ../germline/get-germline ../germline/split-from-imgt.py $(wildcard ../germline/*.g) ../germline/revcomp-fasta.py ../germline/fasta.py ../germline/homo-sapiens/IKZF*fa ../germline/homo-sapiens/ERG*fa 
RELEASE_HELP = ../doc/vidjil-algo.md ../doc/locus.md ../doc/tools.md ../doc/vidjil-format.md ../doc/should-vdj.md ../doc/quality.md ../doc/credits.md ../doc/CHANGELOG ../doc/LICENSE ../README.md ../INSTALL.md
RELEASE_FILES = $(RELEASE_TOOLS) $(RELEASE_TESTS) $(RELEASE_MAKE) $(RELEASE_GERMLINES) $(RELEASE_HELP)


release: release_create release_check

release_create:
	$(info ==== Release $(RELEASE_NAME) ====)

	# Prepare directories
	mkdir -p $(RELEASES_DIR)
	rm -rf $(RELEASES_DIR)/$(RELEASE_ARCHIVE_TAR) $(RELEASES_DIR)/$(RELEASE_ARCHIVE_TGZ) $(RELEASE_DIR_TMP)/$(RELEASE_NAME)
	mkdir -p $(RELEASE_DIR_TMP)/$(RELEASE_NAME)
	mkdir -p $(RELEASE_DIR_TMP)/$(RELEASE_NAME)/$(RELEASE_ALGO)

	# Do the archive
	git archive --format=tar --prefix $(RELEASE_NAME)/$(RELEASE_ALGO) -o $(RELEASES_DIR)/$(RELEASE_ARCHIVE_TAR) HEAD .

	# Tag the release
	if test "$(RELEASE_TAG)" != "notag"; then \
		git tag -f $(RELEASE_NAME); \
	fi

	# Create release.h and git-version.h
	echo '#define RELEASE_TAG "$(RELEASE_TAG)"' > $(RELEASE_DIR_TMP)/$(RELEASE_NAME)/$(RELEASE_ALGO)/$(RELEASE_H); \
	sh create-git-version-h.sh ; cp git-version.h $(RELEASE_DIR_TMP)/$(RELEASE_NAME)/$(RELEASE_ALGO)/$(GIT_VERSION_H)

	# Store a global Makefile
	cp ../Makefile.algo $(RELEASE_DIR_TMP)/$(RELEASE_NAME)/Makefile

	# Store also other files in archive
	for file in $(RELEASE_FILES); do\
	  dir=$(RELEASE_DIR_TMP)/$(RELEASE_NAME)/algo/`dirname "$$file"`/;    \
	  mkdir -p $$dir; \
	  cp -v "$$file" $$dir/ || exit 1;     \
	done

	# A spurious algo/ directory is created, remove it
	rmdir $(RELEASE_DIR_TMP)/$(RELEASE_NAME)/algo

	# Store these files in archive
	cd $(RELEASE_DIR_TMP) ; tar rf ../$(RELEASE_ARCHIVE_TAR) $(RELEASE_NAME)/


	# TODO: make -C $(RELEASE_NAME)/doc html || true

	# Compress the archive
	cd $(RELEASES_DIR) && gzip $(RELEASE_ARCHIVE_TAR)


release_check:
	# Check archive
	$(info)
	$(info ==== Checking $(RELEASE_ARCHIVE_TGZ) ====)

	cd $(RELEASES_DIR) && tar xvfz $(RELEASE_ARCHIVE_TGZ)
	cd $(RELEASES_DIR)/$(RELEASE_NAME) && $(MAKE) germline
	cd $(RELEASES_DIR)/$(RELEASE_NAME) && $(MAKE) vidjil-algo
	cd $(RELEASES_DIR)/$(RELEASE_NAME) && $(MAKE) demo
	cd $(RELEASES_DIR)/$(RELEASE_NAME) && $(MAKE) test
	cd $(RELEASES_DIR)/$(RELEASE_NAME) && $(MAKE) -C src clean && $(MAKE) -C src static && mv -v $(EXEC) $(EXEC)-$(RELEASE_TAG)_`uname -m`




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

