
all: cp deep

cp:
	mkdir -p data/
	scp -pr "vdj:vdj/data/runs/13-0*/*.data" data/
	mkdir -p data/run/
	scp -pr "vdj:vdj/data/runs/13-0*/run-*" data/run/

deep:
	ssh vdj "cd vdj/data/runs ; sh cp-deep-data-json"
	scp -pr "vdj:vdj/data/runs/export-data" data/
