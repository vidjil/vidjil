CXX?=g++
ifeq ($(CXXFLAGS), )
  CXXFLAGS := -W -Wall -std=c++11 -O2 -DNDEBUG
endif
override CXXFLAGS += -I.. -I../lib/
export CXXFLAGS
LDLIBS=-lm -lz
SRC=$(wildcard *.cpp)
EXEC=$(SRC:.cpp=)
LIBCORE=../core/vidjil.a ../lib/lib.a

.PHONY: all core clean forcedep

go: vdj_assign align

all: $(EXEC)

$(EXEC): %: %.o 
	$(MAKE) -C .. base
	$(CXX) -I .. -o $@ $^ $(LIBCORE) $(LDLIBS) $(LDFLAGS)

clean:
	rm -f $(EXEC)
	rm -f *.o


