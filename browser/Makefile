all: germline icons

germline:
	$(MAKE) -C .. $@

icons:
	$(MAKE) -C css/icons

quality:
	jshint --config jshintrc js/*.js
.PHONY: all germline icons
