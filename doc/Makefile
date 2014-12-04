
%.html: %.org
# Requires emacs with org-mode
	emacs -batch $^ -f "org-html-export-to-html"

analysis-example%: format-analysis.org
	emacs -batch $^ -f "org-babel-tangle"
