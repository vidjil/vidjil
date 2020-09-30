TEX=$(wildcard mastering*.tex)
PDF=$(TEX:.tex=.pdf)
HTML=$(TEX:.tex=.html)

all: $(PDF)

$(PDF): %.pdf: %.tex
	pdflatex $^ && pdflatex $^

$(HTML): %.html: %.tex
	htlatex $^

test:
	pandoc --lua-filter extract-code.lua mastering-vidjil.tex -o /dev/null > tutorial-test.rb
