SHOULD=$(wildcard should-get-tests/*.should-get)
TAP=$(SHOULD:.should-get=.tap)

all: $(TAP)

%.tap: %.should-get force
	./should-to-tap.sh $<

force:
