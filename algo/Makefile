CC=g++
OPTIM=-O2 -DNDEBUG  $(COVERAGE) $(DEBUG)
override CXXFLAGS += -W -Wall $(OPTIM)

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

VIDJIL=$(BINDIR)$(EXEC)
ALIGN_CGI=$(CGIDIR)align.cgi

CREATE_VERSION_GIT_H := $(shell test -x ./create-git-version-h.sh && ./create-git-version-h.sh)

.PHONY: all core lib clean forcedep

all: $(VIDJIL) $(ALIGN_CGI)

###

paranoid: clean
	make vidjil OPTIM="$(PARANOID)"

###

kmers: cleankmers
	make CONFIG="-DDEBUG_KMERS"

nokmers: cleankmers
	make

cleankmers:
	rm -f vidjil.o core/windowExtractor.o core/segment.o

###

spaced: cleanspaced
	make

nospaced: cleanspaced
	make CONFIG="-DNO_SPACED_SEEDS"

cleanspaced:
	rm -f vidjil.o core/tools.o

###

$(ALIGN_CGI): cgi/align.o $(LIBCORE)
	mkdir -p $(CGIDIR)
	make -C core OPTIM="$(OPTIM)"
	$(CC) -o $@ $^ $(LDFLAGS) $(LDLIBS) $(CXXFLAGS)
###

debug:
	make clean
	make DEBUG="-ggdb"

$(VIDJIL): $(BINDIR)%: %.o $(LIBCORE)
	make -C core OPTIM="$(OPTIM)"
	make -C lib OPTIM="$(OPTIM)"
	$(CC) -o $@ $^ $(LDFLAGS) $(LDLIBS) $(CXXFLAGS)

###
# Subdirectories
###

core/%.a: FORCE
	make -C core $(notdir $@)

lib/%.a: FORCE
	make -C lib $(notdir $@)

clean:
	make -C core $@
	make -C lib $@
	rm -f *.o cgi/*.o
	cd $(BINDIR) ; rm -f $(EXEC)
	make -C tests $@

cleancoverage: clean
	rm -f *.gcda *.gcno *.gcov
	make -C core cleancoverage
	make -C lib cleancoverage

cleanall: cleancoverage
	make -C tests cleanall

forcedep:
	g++ $(CXXFLAGS) -M $(MAINCORE) > dep.mk
	make -C core forcedep
	make -C lib forcedep

FORCE:

DEP=$(wildcard dep.mk)

ifeq (${DEP},)
$(shell	g++ -M $(MAINCORE) > dep.mk)
endif
include dep.mk

