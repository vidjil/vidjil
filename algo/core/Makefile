CC=g++
OPTIM=-O2 
CXXFLAGS=-W -Wall $(OPTIM)
SRCCORE=$(wildcard *.cpp)
OBJCORE=$(SRCCORE:.cpp=.o)
LIBCORE=vidjil.a

all: $(LIBCORE)

$(LIBCORE): $(OBJCORE)
	ar rc $@ $^

clean:
	rm -f $(OBJCORE) $(LIBCORE)

DEP=$(wildcard dep.mk)

ifeq (${DEP},)
$(shell	g++ -M $(SRCCORE) > dep.mk)
endif
include dep.mk
