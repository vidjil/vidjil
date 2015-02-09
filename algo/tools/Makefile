CC=g++
OPTIM=-O2
override CXXFLAGS += -W -Wall -I.. -I../lib/ $(OPTIM)
LDLIBS=-lm -lz
SRC=$(wildcard *.cpp)
EXEC=$(SRC:.cpp=)
LIBCORE=../core/vidjil.a ../lib/lib.a

.PHONY: all core clean forcedep

all: $(EXEC)

$(EXEC): %: %.o 
	make -C .. OPTIM="$(OPTIM)"
	$(CC) -I .. -o $@ $^ $(LIBCORE)

clean:
	rm -f $(EXEC)
	rm -f *.o


