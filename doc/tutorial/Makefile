TEX=$(wildcard mastering*.tex)
PDF=$(TEX:.tex=.pdf)
HTML=$(TEX:.tex=.html)

all: $(PDF)

$(PDF): %.pdf: %.tex
	pdflatex $^ && pdflatex $^

$(HTML): %.html: %.tex
	htlatex $^

tutorial-test.rb: *.tex
	pandoc --lua-filter extract-code.lua mastering-vidjil.tex -o /dev/null > tutorial-test.rb
	mv tutorial-test.rb ../../browser/test/functional/tutorial-test.rb

