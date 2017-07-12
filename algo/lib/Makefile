CXX?=g++
OPTIM=-O2
override CXXFLAGS += -W -Wall -std=c++11 $(OPTIM)
SRCCORE=$(wildcard *.cpp unbam/*.c)
TMP_OBJCORE=$(SRCCORE:.cpp=.o)
OBJCORE=$(TMP_OBJCORE:.c=.o)
LIBCORE=lib.a

.PHONY: all clean forcedep

all: $(LIBCORE)

$(LIBCORE): $(OBJCORE)
	ar rc $@ $^

unbam/%.o: %.c
	make -C unbam $<

clean:
	rm -f $(OBJCORE) $(LIBCORE)

cleancoverage:
	rm -f *.gcda *.gcno *.gcov

forcedep:
	$(CXX) $(CXXFLAGS) -M $(SRCCORE) > dep.mk

DEP=$(wildcard dep.mk)

ifeq (${DEP},)
$(shell $(CXX) $(CXXFLAGS) -M $(SRCCORE) > dep.mk)
endif
include dep.mk
