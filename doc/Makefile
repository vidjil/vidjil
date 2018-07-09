MD_FILES=$(wildcard *.md)
ORG_FILES=$(wildcard *.org)

all: html htmlorg

html: $(MD_FILES)
	cd .. ; mkdocs build

htmlorg: $(ORG_FILES)
	make $(subst .org,.html, $^)

%.html: %.org
# Requires emacs with org-mode
	emacs -batch $^ -f "org-html-export-to-html"

analysis-example%: format-analysis.org
	python ../tools/org-babel-tangle.py --all $^
