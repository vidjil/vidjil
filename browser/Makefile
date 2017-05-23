all: germline icons

germline:
	$(MAKE) -C .. $@

sha1:
	../tools/create-git-sha1.sh js/git-sha1.js "git_sha1 ="

icons:
	$(MAKE) -C css/icons

quality:
	jshint --config jshintrc js/*.js
.PHONY: all germline icons
