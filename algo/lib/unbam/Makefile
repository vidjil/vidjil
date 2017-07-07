CC= gcc
CFLAGS=-std=gnu99 -g -Wall -O3
LIB=unbam.a
SRC=$(wildcard *.c)
OBJ=$(SRC:.c=.o)

all: $(LIB)
$(LIB): $(OBJ)
	ar rc $(LIB) $^

%.o: %.c
	$(CC) $(CFLAGS) -c $^
clean:
	rm -f $(OBJ)
