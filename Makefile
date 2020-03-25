# Convenience targets for executing common actions from the root of the repo

docs:
	$(MAKE) -C docs docs_clean html

lint:
	$(MAKE) -C cli lint
	$(MAKE) -C fathom lint

test:
	$(MAKE) -C cli test
	$(MAKE) -C fathom test

clean:
	$(MAKE) -C cli clean
	$(MAKE) -C docs clean
	$(MAKE) -C fathom clean


.PHONY: clean docs lint test
