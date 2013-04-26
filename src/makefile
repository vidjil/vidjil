CC=g++
OPTIM=-O2 -DNO_SPACED_SEEDS
CFLAGS=-W -Wall $(OPTIM) $(DEBUG)
LDFLAGS=
EXEC=vidjil kmer kmer_count cut count detailed_affect
SRCCORE=$(wildcard core/*.cpp) $(wildcard core/*.h) 
MAINCORE=$(wildcard *.cpp)
OBJCORE=$(SRCCORE:.cpp=.o)
LIBCORE=core.a

BINDIR=..

v: vidjil

all: $(EXEC)

debug:
	make clean
	make DEBUG="-ggdb"

$(EXEC): %: %.o $(LIBCORE) 
	$(CC) -o $(BINDIR)/$@ $^ $(LDFLAGS) $(CFLAGS)

core: $(LIBCORE)

$(LIBCORE): $(OBJCORE)
	rm -f $(LIBCORE)
	ar rc $@ $^

%.o: %.cpp %.h
	$(CC) -o $@ -c $< $(CFLAGS)

%.o: %.cpp 
	$(CC) -o $@ -c $< $(CFLAGS)

clean:
	rm -f core/*.o *.o $(LIBCORE)
	cd $(BINDIR) ; rm -f $(EXEC)
	make -C tests $@

forcedep:
	g++ -M $(SRCCORE) $(MAINCORE) > dep.mk

DEP=$(wildcard dep.mk)

ifeq (${DEP},)
$(shell	g++ -M $(SRCCORE) $(MAINCORE) > dep.mk)
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


