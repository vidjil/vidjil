TEX=$(wildcard mastering*.tex)
PDF=$(TEX:.tex=.pdf)
HTML=$(TEX:.tex=.html)

all: $(PDF)

$(PDF): %.pdf: %.tex
	pdflatex $^ && pdflatex $^

$(HTML): %.html: %.tex
	htlatex $^

tutorial-test.rb: *.tex
	pandoc --lua-filter extract-code.lua tutorial-vidjil-browser.tex -o /dev/null > tutorial-test.rb
	mv tutorial-test.rb ../../browser/test/functional/tutorial-test.rb

tutorial-server.rb: *.tex
	pandoc --lua-filter extract-code.lua tutorial-vidjil-server.tex -o /dev/null > tutorial-server.rb
	mv tutorial-server.rb ../../server/web2py/applications/vidjil/tests/functional/tutorial-server.rb
