CC=g++
OPTIM=-O2 
override CXXFLAGS += -W -Wall -std=gnu++11 $(OPTIM)
SRCCORE=$(wildcard *.cpp)
OBJCORE=$(SRCCORE:.cpp=.o)
LIBCORE=vidjil.a

.PHONY: all clean forcedep

all: $(LIBCORE)

$(LIBCORE): $(OBJCORE)
	ar rc $@ $^

clean:
	rm -f $(OBJCORE) $(LIBCORE)

cleancoverage:
	rm -f *.gcda *.gcno *.gcov

forcedep:
	g++ $(CXXFLAGS) -M $(SRCCORE) > dep.mk

DEP=$(wildcard dep.mk)

ifeq (${DEP},)
$(shell	g++ -M $(SRCCORE) > dep.mk)
endif
include dep.mk
