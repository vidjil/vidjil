DATA=$(wildcard ???[VDJ].fa ???[VDJ]_upstream.fa ???[VDJ]_downstream.fa {IG,TR}*=*.fa) IGK-INTRON.fa IGK-KDE.fa TRDD2_upstream.fa TRDD3_downstream.fa

germline:
	sh get-saved-germline

js: ../browser/js/germline.js

../browser/js/germline.js: $(DATA) germlines.data
	python buildBrowserGermline.py $^ $@

get-all-data: clean $(DATA)

$(DATA):
	sh get-germline
	$(MAKE) js

clean:
	rm -f $(DATA) ../browser/js/germline.js

diff-from-saved:
	rm -rf saved-germline
	mkdir saved-germline
	cd saved-germline ; sh ../get-saved-germline
	echo
	diff -r -u -x "*[.][^f][^a]" -x "germline*" -x "get*" -x "Makefile" -x "saved-*" saved-germline/ .
