SHOULD=$(wildcard should-get-tests/*.should-get)
TAP=$(SHOULD:.should-get=.tap)

all: $(TAP) doctests

should-get-tests/fuse-doc.tap: should-get-tests/fuse-doc.should-get force
	$(MAKE) -C ../../doc analysis-example1.vidjil
	../should-to-tap.sh $<

%.tap: %.should-get force
	../should-to-tap.sh $<

doctests:
	@echo "*** Launching python tests..."
	python -m doctest -v ../fuse.py
	python -m doctest -v ../utils.py
	python -m doctest -v ../vidjil-to-fasta.py
	python ../org-babel-tangle.py --test
	@echo "*** All python tests passed"

force:
