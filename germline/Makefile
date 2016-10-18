DATA=$(wildcard ???[VDJ].fa ???[VDJ]_upstream.fa ???[VDJ]_downstream.fa {IG,TR}*=*.fa) IGK-INTRON.fa IGK-KDE.fa TRDD2_upstream.fa TRDD3_downstream.fa
GERMLINE_JS=../browser/js/germline.js

germline:
	sh get-saved-germline

js: $(GERMLINE_JS)

$(GERMLINE_JS): $(DATA) germlines.data
	python buildBrowserGermline.py $^ $@

get-all-data: clean $(DATA)

$(DATA):
	sh get-germline
	$(MAKE) js

clean:
	rm -f $(DATA) $(GERMLINE_JS)

diff-from-saved:
	rm -rf saved-germline
	mkdir saved-germline
	cd saved-germline ; sh ../get-saved-germline
	echo
	diff -r -u -x "*[.][^f][^a]" -x "germline*" -x "get*" -x "Makefile" -x "saved-*" saved-germline/ .
