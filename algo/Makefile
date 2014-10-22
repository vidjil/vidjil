CC=g++
OPTIM=-O2 -DNDEBUG  $(COVERAGE)
CXXFLAGS=-W -Wall $(OPTIM) $(DEBUG) $(CONFIG)
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

