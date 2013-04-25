CC=g++
CFLAGS=-W -Wall -g -O0
INCLUDE=-I ..
LDFLAGS=
SRC= tests.cpp
EXEC=$(SRC:.cpp=)
DEP=../core.a


test: all
	@echo
	@echo "*** Launching unit tests..."
	./tests
	cat tests.cpp.tap
	@echo "*** All unit tests passed"

all: core $(EXEC)
	@echo "All tests compiled."

$(EXEC): % : %.o $(DEP) 
	$(CC) -o $@ $^ $(LDFLAGS) $(CFLAGS)


../core.a: core

core:
	make OPTIM=-O0 -C .. core.a

%.o: %.cpp 
	$(CC) -o $@ $(INCLUDE) -c $< $(CFLAGS)

clean:
	rm -f *.o $(EXEC)
	make -C .. clean

forcedep:
	g++ $(INCLUDE) -M $(SRC) > dep.mk

DEP=$(wildcard dep.mk)

ifeq (${DEP},)
$(shell	g++ $(INCLUDE) -M $(SRC) > dep.mk)
endif
include dep.mk

