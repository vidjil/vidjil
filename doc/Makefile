MD_FILES=$(wildcard *.md)

all: html

html: $(MD_FILES)
	cd .. ; mkdocs build

analysis-example%: vidjil-format.md
	python ../tools/org-babel-tangle.py --all $^
