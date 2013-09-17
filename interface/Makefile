
all: cp deep

cp:
	mkdir -p data/
	scp -pr "vdj:vdj/data/runs/13-0*/*.data" data/
	mkdir -p data/run/
	scp -pr "vdj:vdj/data/runs/13-0*/run-*" data/run/

deep:
	ssh vdj "cd vdj/data/runs ; sh cp-deep-data-json"
	scp -pr "vdj:vdj/data/runs/export-data" data/


Leu:
	cd data/export-data/13-09 ; python ../../../fuse.py BCD-Leu.data  100 out-vidjil/BCD/data.json out-vidjil/Leu+0*/data.json  out-vidjil/Leu+1*/data.json  out-vidjil/Leu+5*/data.json  out-vidjil/Leu+2*/data.json  out-vidjil/Leu+[3467]*/data.json  
