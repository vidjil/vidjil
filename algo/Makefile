CC=g++
OPTIM=-O2 
CXXFLAGS=-W -Wall $(OPTIM) $(DEBUG) $(CONFIG)
LDFLAGS=-lm
EXEC=vidjil kmer kmer_count cut count detailed_affect
MAINCORE=$(wildcard *.cpp)
LIBCORE=core/vidjil.a

BINDIR=..

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
	make -C core
	$(CC) -o $(BINDIR)/$@ $^ $(LIBCORE) $(LDFLAGS) $(CXXFLAGS)

clean:
	make -C core $@
	cd $(BINDIR) ; rm -f $(EXEC)
	make -C tests $@

forcedep:
	g++ -M $(MAINCORE) > dep.mk

DEP=$(wildcard dep.mk)

ifeq (${DEP},)
$(shell	g++ -M $(MAINCORE) > dep.mk)
endif
include dep.mk


RELEASE_H = release.h
RELEASE_SOURCE = $(wildcard src/*.cpp) $(wildcard src/*.h)  $(wildcard src/core/*.cpp) $(wildcard src/core/*.h)  
RELEASE_FILES = $(RELEASE_SOURCE) src/Makefile germline/get-germline doc/README doc/LICENSE
RELEASE_ARCHIVE = vidjil-$(RELEASE_TAG).tgz

CURRENT_DIR = .
RELEASE_FILES_VID = $(addprefix $(CURRENT_DIR)/, $(RELEASE_FILES))


# make distrib RELEASE_TAG=2013.04alpha
distrib:	
	$(info ==== Release $(RELEASE_TAG) ====)

	# Tag the release
	git tag release-$(RELEASE_H)
	echo '#define RELEASE_TAG "$(RELEASE_TAG)"' > $(RELEASE_H)

	mkdir -p release 
	rm -f release/$(RELEASE_ARCHIVE)
	cd .. ; tar cvfz  $(CURRENT_DIR)/release/$(RELEASE_ARCHIVE) $(RELEASE_FILES_VID)

	# Untag the source
	rm $(RELEASE_H) ; touch $(RELEASE_H)

	# Check archive
	cd release ; tar xvfz $(RELEASE_ARCHIVE)
	cd release/$(CURRENT_DIR) ; make


