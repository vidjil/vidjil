
DEFAULT_G=homo-sapiens.g

DATA=$(wildcard homo-sapiens/*.fa)
OTHER_DATA=$(wildcard IGHC=*.fa) $(wildcard mus-musculus/*.fa) $(wildcard rattus-norvegicus/*.fa) $(wildcard ???[VDJ].fa) # Only for make clean
GERMLINE_JS=../browser/js/germline.js

all: germline

germline: $(GERMLINE_JS) $(DATA)

js: $(GERMLINE_JS)

$(GERMLINE_JS): $(DATA) $(DEFAULT_G)
	python buildBrowserGermline.py $(DEFAULT_G) $@

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
