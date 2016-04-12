
LESSC=lessc

all: dark.css light.css svg.css

dark.css: dark.less vidjil.less
	$(LESSC) dark.less dark.css

light.css: light.less vidjil.less
	$(LESSC) light.less light.css
	
svg.css: svg.less vidjil.less
	$(LESSC) svg.less svg.css


no:
	$(MAKE) LESSC="./node lessc"

