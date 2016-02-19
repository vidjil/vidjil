DATA=$(wildcard ???[VDJ].fa ???[VDJ]_upstream.fa ???[VDJ]_downstream.fa {IG,TR}*=*.fa) IGK-INTRON.fa IGK-KDE.fa TRDD2_upstream.fa TRDD3_downstream.fa

germline:
	sh get-saved-germline

js: ../browser/js/germline.js

../browser/js/germline.js: $(DATA) germlines.data
	python buildBrowserGermline.py $^ $@

get-all-data: js

$(DATA):
	sh get-germline

clean:
	rm -f $(DATA)
