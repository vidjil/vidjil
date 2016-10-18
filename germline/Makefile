DATA=IGHV.fa IGHD.fa IGHJ.fa IGKV.fa IGKJ.fa IGLV.fa IGLJ.fa TRAV.fa TRAJ.fa TRDV.fa TRDD.fa TRDJ.fa TRGV.fa TRGJ.fa IGHD_upstream.fa  TRBD_upstream.fa  TRDD2_upstream.fa  TRDD_upstream.fa IGHJ_downstream.fa  IGKJ_downstream.fa  IGLJ_downstream.fa  TRAJ_downstream.fa  TRBJ_downstream.fa  TRDD3_downstream.fa  TRDJ_downstream.fa  TRGJ_downstream.fa IGK-INTRON.fa IGK-KDE.fa
OTHER_DATA=$(wildcard IGHC=*.fa) $(wildcard mus-musculus/*.fa) $(wildcard rattus-norvegicus/*.fa) # Only for make clean
GERMLINE_JS=../browser/js/germline.js

all: germline

germline: $(GERMLINE_JS) $(DATA)

js: $(GERMLINE_JS)

$(GERMLINE_JS): $(DATA) germlines.data
	python buildBrowserGermline.py germlines.data $@

get-all-data: clean $(DATA)
	sh get-germline

$(DATA): germline_id
	sh get-saved-germline

clean:
	rm -f $(DATA) $(GERMLINE_JS) $(OTHER_DATA)

diff-from-saved:
	rm -rf saved-germline
	mkdir saved-germline
	cd saved-germline ; sh ../get-saved-germline
	echo
	diff -r -u -x "*[.][^f][^a]" -x "germline*" -x "get*" -x "Makefile" -x "saved-*" saved-germline/ .

.PHONY: all germline js get-all-data clean diff-from-saved
