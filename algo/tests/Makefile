CC=g++
CXXFLAGS=-W -Wall -g -O0
INCLUDE=-I ..
LDFLAGS=
SRC= tests.cpp
EXEC=$(SRC:.cpp=)
OTHER_SRC=$(wildcard *.cpp)
LIB=../core/vidjil.a
SHOULD=$(wildcard *.should_get)
SHOULD_LOG=$(SHOULD:.should_get=.log)

.PHONY: all force clean forcedep

test: all
	@echo
	@echo "*** Launching unit tests..."
	./tests
	cat tests.cpp.tap
	@echo "*** All unit tests passed"

all: core $(EXEC)
	@echo "All tests compiled."

should: vidjil $(SHOULD_LOG)

%.log: %.should_get force
	./should-to-tap.sh $<

$(EXEC): % : %.o $(LIB) 
	$(CC) -o $@ $< $(LIB) $(LDFLAGS) $(CXXFLAGS)


../core.a: core

vidjil:
	make OPTIM="-O0 -g" -C ../

core:
	make OPTIM="-O0 -g" -C ../core 

%.o: %.cpp $(OTHER_SRC)
	$(CC) -o $@ $(INCLUDE) -c $< $(CXXFLAGS)

clean:
	rm -f *.o $(EXEC) *.tap *.log

forcedep:
	g++ $(INCLUDE) -M $(SRC) > dep.mk

force:

DEP=$(wildcard dep.mk)

ifeq (${DEP},)
$(shell	g++ $(INCLUDE) -M $(SRC) > dep.mk)
endif
include dep.mk

