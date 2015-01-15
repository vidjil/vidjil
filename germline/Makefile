DATA=???[VDJ].fa IGK-INTRON.fa IGK-KDE.fa TRDD2-01.fa TRDD3-01.fa

germline:
	sh get-saved-germline

../browser/js/germline.js: $(DATA) germlines.data
	python buildBrowserGermline.py $^ $@

get-all-data:
	sh get-germline
	make ../browser/js/germline.js

clean:
	rm -f $(DATA)
