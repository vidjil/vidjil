
LESSC=lessc

all: dark.css light.css

dark.css: dark.less style.less
	$(LESSC) dark.less dark.css

light.css: light.less style.less
	$(LESSC) light.less light.css


no:
	make LESSC="./node lessc"

