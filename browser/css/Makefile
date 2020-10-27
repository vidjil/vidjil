
LESSC=lessc

all: dark.css light.css svg.css talk.css segmenter_page.css

dark.css: dark.less vidjil.less aligner.less
	$(LESSC) dark.less dark.css

light.css: light.less vidjil.less aligner.less
	$(LESSC) light.less light.css

talk.css: talk.less light.less vidjil.less
	$(LESSC) $< $@

svg.css: svg.less vidjil.less
	$(LESSC) svg.less svg.css

segmenter_page.css: segmenter_page.less vidjil.less
	$(LESSC) segmenter_page.less segmenter_page.css

no:
	$(MAKE) LESSC="./node lessc"
