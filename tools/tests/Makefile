
all: should doctests

should-get-tests/fuse-doc.tap: should-get-tests/fuse-doc.should-get force
	$(MAKE) -C ../../doc analysis-example1.vidjil

should: should-get-tests/fuse-doc.tap
	python3 ../should.py should-get-tests/*.should-get

should-ijson: 
	python3 ../should.py --var FUSE_OPTIONS=--ijson should-get-tests/fuse-*.should-get

doctests:
	@echo "*** Launching python tests..."
	python -m doctest -v ../fuse.py
	python -m doctest -v ../utils.py
	python -m doctest -v ../vidjil-to-fasta.py
	python ../org-babel-tangle.py --test
	@echo "*** All python tests passed"

force:
