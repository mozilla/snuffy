# We avoid $(CURDIR) because it spits out /cygdrive/c/... on Windows Cygwin
# installs and leads to things that don't work.
VIRTUAL_ENV = ./venv
PYTHON3 ?= python3
# PATH seems to be exported even without "export", but I kept it to be explicit.
export PATH := $(VIRTUAL_ENV)/bin:$(VIRTUAL_ENV)/Scripts:$(PATH)

all: venv fathom.zip

release: venv fathom.zip
	PATH="$(PATH)" python setup.py sdist bdist_wheel

lint: venv npm_installed
	@PATH="$(PATH)" flake8 --exclude $(VIRTUAL_ENV) .
	@cd ../fathom && node_modules/.bin/eslint -c .eslintrc.yml ../cli/fathom_web/test/resources

test: venv fathom.zip
	@PATH="$(PATH)" pytest fathom_web/test

# I'm open to ideas on how to fire this off only when necessary. But it's
# pretty fast, at least.
fathom.zip:
	cd .. && git archive --format zip --output cli/fathom_web/fathom.zip HEAD -9 fathom fathom_fox

clean:
	rm -rf $(VIRTUAL_ENV) fathom.zip

venv: $(VIRTUAL_ENV)/pyvenv.cfg


# Private targets:

# Make a virtualenv at $VIRTUAL_ENV if there isn't one or if requirements have
# changed. Install the dev requirements and the actual requirements.
$(VIRTUAL_ENV)/pyvenv.cfg: dev-requirements.txt doc-building-requirements.txt setup.py
	$(PYTHON3) -m venv $(VIRTUAL_ENV)
	# We don't path-qualify pip3 because python -m venv on Travis creates a
	# venv with no pip executable in it.
	PATH="$(PATH)" pip3 install -r dev-requirements.txt -r doc-building-requirements.txt
	PATH="$(PATH)" pip3 install -e .

npm_installed:
	@$(MAKE) -C ../fathom .npm_installed

.PHONY: release lint test clean venv npm_installed
