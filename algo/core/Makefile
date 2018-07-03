CXX?=g++
ifeq ($(CXXFLAGS), )
  CXXFLAGS := -W -Wall -std=c++11 -O2 -DNDEBUG
endif
export CXXFLAGS
INC=-I ../
SRCCORE=$(wildcard *.cpp)
OBJCORE=$(SRCCORE:.cpp=.o)
LIBCORE=vidjil.a

.PHONY: all clean forcedep

all: $(LIBCORE)

$(LIBCORE): $(OBJCORE)
	ar rc $@ $^

%.o: %.cpp
	$(CXX) $(CXXFLAGS) $(INC) -c $<

clean:
	rm -f $(OBJCORE) $(LIBCORE)

cleancoverage:
	rm -f *.gcda *.gcno *.gcov

forcedep:
	$(CXX) $(CXXFLAGS) $(INC) -M $(SRCCORE) > dep.mk

DEP=$(wildcard dep.mk)

ifeq (${DEP},)
$(shell	$(CXX) $(CXXFLAGS) $(INC) -M $(SRCCORE) > dep.mk)
endif
include dep.mk
