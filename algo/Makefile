CC=g++
OPTIM=-O2 -DNDEBUG  $(COVERAGE)
CXXFLAGS=-W -Wall $(OPTIM) $(DEBUG) $(CONFIG)

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
LDFLAGS=-lm
EXEC=vidjil
MAINCORE=$(wildcard *.cpp)
LIBCORE=core/vidjil.a

BINDIR=..
CGIDIR=../browser/cgi

CREATE_VERSION_GIT_H := $(shell test -x ./create-git-version-h.sh && ./create-git-version-h.sh)

.PHONY: all core clean forcedep

v: vidjil align.cgi

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

align.cgi: cgi/align.o
	mkdir -p $(CGIDIR)
	make -C core OPTIM="$(OPTIM)"
	$(CC) -o $(CGIDIR)/align.cgi cgi/align.o $(LIBCORE) $(LDFLAGS) $(CXXFLAGS)
###

all: $(EXEC)

debug:
	make clean
	make DEBUG="-ggdb"

$(EXEC): %: %.o 
	make -C core OPTIM="$(OPTIM)"
	$(CC) -o $(BINDIR)/$@ $^ $(LIBCORE) $(LDFLAGS) $(CXXFLAGS)

clean:
	make -C core $@
	rm -f *.o *.gcda *.gcno *.gcov cgi/*.o
	cd $(BINDIR) ; rm -f $(EXEC)
	make -C tests $@

forcedep:
	g++ -M $(MAINCORE) > dep.mk
	make -C core forcedep

DEP=$(wildcard dep.mk)

ifeq (${DEP},)
$(shell	g++ -M $(MAINCORE) > dep.mk)
endif
include dep.mk

