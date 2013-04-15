CC=g++
OPTIM=-O2 -DNO_SPACED_SEEDS
CFLAGS=-W -Wall -g $(OPTIM)
LDFLAGS=
EXEC=vidjil kmer kmer_count cut count detailed_affect
SRCCORE=$(wildcard core/*.cpp) $(wildcard core/*.h) 
MAINCORE=$(wildcard *.cpp)
OBJCORE=$(SRCCORE:.cpp=.o)
LIBCORE=core.a

RELEASE_H = release.h
RELEASE_FILES = vidjil.cpp vidjil.h $(RELEASE_H) Makefile $(SRCCORE)
RELEASE_ARCHIVE = vidjil-$(RELEASE_TAG).tgz


v: vidjil

all: $(EXEC)

$(EXEC): %: %.o $(LIBCORE) 
	$(CC) -o $@ $^ $(LDFLAGS) $(CFLAGS)

# cut: cut.o $(LIBCORE)
# 	$(CC) -o $@ $^ $(LDFLAGS) $(CFLAGS)

# count: count.o $(LIBCORE)
# 	$(CC) -o $@ $^ $(LDFLAGS) $(CFLAGS)

# kmer: kmer.o $(LIBCORE) 
# 	$(CC) -o $@ $^ $(LDFLAGS) $(CFLAGS)
# kmer_count: kmer_count.o $(LIBCORE) 
# 	$(CC) -o $@ $^ $(LDFLAGS) $(CFLAGS)

core: $(LIBCORE)

$(LIBCORE): $(OBJCORE)
	rm -f $(LIBCORE)
	ar rc $@ $^

%.o: %.cpp %.h
	$(CC) -o $@ -c $< $(CFLAGS)

%.o: %.cpp 
	$(CC) -o $@ -c $< $(CFLAGS)

clean:
	rm -f core/*.o *.o $(EXEC) $(LIBCORE)

forcedep:
	g++ -M $(SRCCORE) $(MAINCORE) > dep.mk

DEP=$(wildcard dep.mk)

ifeq (${DEP},)
$(shell	g++ -M $(SRCCORE) $(MAINCORE) > dep.mk)
endif
include dep.mk




CURRENT_DIR = newkmer
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


