
LESSC=lessc

all: dark.css light.css

dark.css: dark.less vidjil.less
	$(LESSC) dark.less dark.css

light.css: light.less vidjil.less
	$(LESSC) light.less light.css


no:
	make LESSC="./node lessc"

