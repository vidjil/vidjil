SHOULD=$(wildcard *.should_get)
TAP=$(SHOULD:.should_get=.tap)

all: $(TAP) doctests

fuse-doc.tap: fuse-doc.should_get force
	make -C ../../doc analysis-example1.vidjil
	./should-to-tap.sh $<

%.tap: %.should_get force
	./should-to-tap.sh $<

doctests:
	@echo "*** Launching python tests..."
	python -m doctest -v ../fuse.py
	python -m doctest -v ../utils.py
	python ../org-babel-tangle.py --test
	@echo "*** All python tests passed"

force:
