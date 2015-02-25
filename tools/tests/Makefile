SHOULD=$(wildcard *.should_get)
TAP=$(SHOULD:.should_get=.tap)

all: $(TAP) test_fuse

fuse-doc.tap: fuse-doc.should_get force
	make -C ../../doc analysis-example1.vidjil
	./should-to-tap.sh $<

%.tap: %.should_get force
	./should-to-tap.sh $<

test_fuse:
	@echo "*** Launching python tests..."
	python ../fuse.py --test x
	@echo "*** All python tests passed"

force:
