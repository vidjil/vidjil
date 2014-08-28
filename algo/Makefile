CC=g++
OPTIM=-O2 -DNDEBUG
CXXFLAGS=-W -Wall $(OPTIM) $(DEBUG) $(CONFIG)
LDFLAGS=-lm
EXEC=vidjil kmer kmer_count cut count detailed_affect
MAINCORE=$(wildcard *.cpp)
LIBCORE=core/vidjil.a

BINDIR=..

CREATE_VERSION_GIT_H := $(shell ./create-git-version-h.sh)

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

