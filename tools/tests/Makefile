SHOULD=$(wildcard *.should_get)
TAP=$(SHOULD:.should_get=.tap)

all: $(TAP)

fuse-doc.tap: fuse-doc.should_get force
	make -C ../../doc analysis-example1.vidjil
	./should-to-tap.sh $<

%.tap: %.should_get force
	./should-to-tap.sh $<

force:
