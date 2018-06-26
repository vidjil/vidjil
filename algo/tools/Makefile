CXX?=g++
OPTIM=-O2
override CXXFLAGS += -std=c++11 -W -Wall -I.. -I../lib/ $(OPTIM)
LDLIBS=-lm -lz
SRC=$(wildcard *.cpp)
EXEC=$(SRC:.cpp=)
LIBCORE=../core/vidjil.a ../lib/lib.a

.PHONY: all core clean forcedep

go: vdj_assign align

all: $(EXEC)

$(EXEC): %: %.o 
	$(MAKE) -C .. base OPTIM="$(OPTIM)"
	$(CXX) -I .. -o $@ $^ $(LIBCORE) $(LDLIBS) $(LDFLAGS)

clean:
	rm -f $(EXEC)
	rm -f *.o


