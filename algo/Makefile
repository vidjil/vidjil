CC=g++
OPTIM=-O2 -DNDEBUG  $(COVERAGE)
CXXFLAGS=-W -Wall $(OPTIM) $(DEBUG) $(CONFIG)
LDFLAGS=-lm
EXEC=vidjil
MAINCORE=$(wildcard *.cpp)
LIBCORE=core/vidjil.a

BINDIR=..

CREATE_VERSION_GIT_H := $(shell test -x ./create-git-version-h.sh && ./create-git-version-h.sh)

.PHONY: all core clean forcedep

v: vidjil

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

all: $(EXEC)

debug:
	make clean
	make DEBUG="-ggdb"

$(EXEC): %: %.o 
	make -C core OPTIM="$(OPTIM)"
	$(CC) -o $(BINDIR)/$@ $^ $(LIBCORE) $(LDFLAGS) $(CXXFLAGS)

clean:
	make -C core $@
	rm -f *.o *.gcda *.gcno *.gcov
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

