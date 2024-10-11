TEX=$(wildcard mastering*.tex)
PDF=$(TEX:.tex=.pdf)
HTML=$(TEX:.tex=.html)

all: $(PDF)

$(PDF): %.pdf: %.tex
	pdflatex $^ && pdflatex $^

$(HTML): %.html: %.tex
	htlatex $^


build_tutorial_cypress_client: *.tex
	pandoc --lua-filter extract-code.lua tutorial-vidjil-browser.tex -o /dev/null > doc_tutorial_client.cy.js
	mv doc_tutorial_client.cy.js ../../browser/test/cypress/e2e/doc_tutorial_client.cy.js

build_tutorial_cypress_server: *.tex
	pandoc --lua-filter extract-code.lua tutorial-vidjil-server.tex -o /dev/null > doc_tutorial_server.cy.js
	mv doc_tutorial_server.cy.js ../../server/py4web/apps/vidjil/tests/cypress/e2e//doc_tutorial_server.cy.js