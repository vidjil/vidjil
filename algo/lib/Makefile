CC=g++
OPTIM=-O2
override CXXFLAGS += -W -Wall $(OPTIM)
SRCCORE=$(wildcard *.cpp)
OBJCORE=$(SRCCORE:.cpp=.o)
LIBCORE=lib.a

.PHONY: all clean forcedep

all: $(LIBCORE)

$(LIBCORE): $(OBJCORE)
	ar rc $@ $^

clean:
	rm -f $(OBJCORE) $(LIBCORE) *.gcda *.gcno *.gcov

forcedep:
	g++ $(CXXFLAGS) -M $(SRCCORE) > dep.mk

DEP=$(wildcard dep.mk)

ifeq (${DEP},)
$(shell	g++ -M $(SRCCORE) > dep.mk)
endif
include dep.mk
