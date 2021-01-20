
DEFAULT_G=homo-sapiens.g

DIRS=homo-sapiens/ mus-musculus/ rattus-norvegicus/
GERMLINE_JS=../browser/js/germline.js

all: get-saved-data

germline: get-saved-data $(GERMLINE_JS)

js: $(GERMLINE_JS)

$(GERMLINE_JS): $(DEFAULT_G)
	python buildBrowserGermline.py $(DEFAULT_G) $@

get-all-data: clean
	sh get-germline
	python get-CD.py

get-saved-data: germline_id
	sh get-saved-germline

clean:
	rm -rf $(DIRS) $(GERMLINE_JS) 

diff-from-saved:
	rm -rf saved-germline
	mkdir saved-germline
	cd saved-germline ; sh ../get-saved-germline
	echo
	diff -r -u -x "*[.][^f][^a]" -x "germline*" -x "get*" -x "Makefile" -x "saved-*" saved-germline/ .

tests:
	python split-germlines.py --test
	make -C tests


distrib: get-all-data js
	cd .. ; tar cvzf germline-`cat germline/germline_id`.tar.gz germline/germline_id germline/*/*.fa germline/IMGT_RELEASE browser/js/germline.js

.PHONY: all germline js get-all-data clean diff-from-saved tests
