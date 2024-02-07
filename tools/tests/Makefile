
all: should doctests

should-get-tests/fuse-doc.tap: should-get-tests/fuse-doc.should-get force
	$(MAKE) -C ../../doc analysis-example1.vidjil

data/fused_multiple.vidjil: data/fused_multiple.vidjil.gz
	gunzip -k $^
should: should-get-tests/fuse-doc.tap
	python3 ../should.py should-get-tests/*.should-get

should-ijson: 
	python3 ../should.py --var FUSE_OPTIONS=--ijson should-get-tests/fuse-*.should-get

doctests:
	@echo "*** Launching python tests..."
	python3 -m doctest -v ../fuse.py
	python3 -m doctest -v ../utils.py
	python3 -m doctest -v ../vidjil-to-fasta.py
	python2.7 -m doctest -v ../../algo/tests/should-vdj-to-tap.py
	python2.7 -m doctest -v ../../algo/tests/repseq_vdj.py
	python3 ../org-babel-tangle.py --test
	@echo "*** All python tests passed"

force:
