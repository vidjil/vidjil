TEX=$(wildcard mastering*.tex)
PDF=$(TEX:.tex=.pdf)
HTML=$(TEX:.tex=.html)

all: $(PDF)

$(PDF): %.pdf: %.tex
	pdflatex $^ && pdflatex $^

$(HTML): %.html: %.tex
	htlatex $^


build_tutorial_cypress_client: *.tex
	pandoc --lua-filter extract-code.lua tutorial-vidjil-browser.tex -o /dev/null > doc_tutorial_client.js
	mv test_tutorial_client.js ../../browser/test/cypress/integration/doc_tutorial_client.js

build_tutorial_cypress_server: *.tex
	pandoc --lua-filter extract-code.lua tutorial-vidjil-server.tex -o /dev/null > doc_tutorial_server.js
	mv test_tutorial_server.js ../../server/web2py/applications/vidjil/tests/cypress/integration/doc_tutorial_server.js