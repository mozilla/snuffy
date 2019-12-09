# If there's an activated virtualenv, use that. Otherwise, make one in the cwd.
# We avoid $(CURDIR) because it spits out /cygdrive/c/... on Windows Cygwin
# installs and leads to things that don't work.
VIRTUAL_ENV ?= ./venv
PYTHON3 ?= python3
PATH := ./node_modules/.bin:$(VIRTUAL_ENV)/bin:$(VIRTUAL_ENV)/Scripts:$(PATH)

JS := $(shell find . -name '*.mjs' | grep -v '^./node_modules/.*' | sed 's/\.mjs/\.js/')

# It's faster to invoke Babel once and compile everything than to invoke it
# separately on even 2 individual files that changed.
%.js: %.mjs .npm_installed .babelrc; @node_modules/.bin/babel *.mjs **/*.mjs --out-dir . --relative

all: $(JS)

lint: js_lint py_lint

js_lint: .npm_installed
	@node_modules/.bin/eslint --ext mjs .
	@node_modules/.bin/eslint test/browser

py_lint: $(VIRTUAL_ENV)/pyvenv.cfg
	@flake8 cli

test: js_test py_test

js_test: $(JS) .npm_installed
	@node_modules/.bin/nyc --reporter=text-summary node_modules/mocha/bin/_mocha --recursive

py_test: $(VIRTUAL_ENV)/pyvenv.cfg
	@pytest cli/fathom_web/test

coveralls: .npm_installed
	node_modules/.bin/nyc report --reporter=text-lcov | coveralls

debugtest: $(JS) .npm_installed
	# This is known to work on node 7.6.0.
	@node_modules/.bin/mocha --inspect-brk

publish: $(JS)
	npm publish

cli:
	cd cli && python setup.py sdist bdist_wheel

bundle: dist/fathom.js

doc: .doc_tools_installed .npm_installed
	$(MAKE) -C docs clean html

clean:
	rm -rf $(JS) venv .doc_tools_installed .npm_installed


# Private targets:

# Make a virtualenv at $VIRTUAL_ENV if there isn't one or if requirements have
# changed. Install the dev requirements and the actual requirements.
$(VIRTUAL_ENV)/pyvenv.cfg: tooling/dev-requirements.txt cli/setup.py
	$(PYTHON3) -m venv $(VIRTUAL_ENV)
	pip3 install -r tooling/dev-requirements.txt
	pip3 install -e cli -f https://download.pytorch.org/whl/torch_stable.html

# Install the doc-building requirements.
.doc_tools_installed: $(VIRTUAL_ENV)/pyvenv.cfg tooling/doc-building-requirements.txt
	pip3 install -r tooling/doc-building-requirements.txt
	touch $@

# .npm_installed is an empty file we touch whenever we run npm install. This
# target redoes the install if package.json is newer than that file:
.npm_installed: package.json
	npm install
	touch $@

dist/fathom.js: rollup.config.js .npm_installed
	@node_modules/.bin/rollup -c


.PHONY: all lint js_lint py_lint test js_test py_test all_js_test coveralls debugtest publish cli bundle doc clean
