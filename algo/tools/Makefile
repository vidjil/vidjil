CC=g++
OPTIM=-O2 -DNDEBUG
CXXFLAGS=-W -Wall -I.. $(OPTIM) $(DEBUG) $(CONFIG)
LDFLAGS=-lm -lz
SRC=$(wildcard *.cpp)
EXEC=$(SRC:.cpp=)
LIBCORE=../core/vidjil.a ../lib/lib.a

.PHONY: all core clean forcedep

all: $(EXEC)

$(EXEC): %: %.o 
	make -C .. OPTIM="$(OPTIM)"
	$(CC) -I .. -o $@ $^ $(LIBCORE) $(LDFLAGS) $(CXXFLAGS)

clean:
	rm -f $(EXEC)
	rm -f *.o


