all:

debug:
	@npm run debug

lint:
	@npm run lint

test:
	@npm run test

debugtest:
	@npm run test -- -d
	# Run `node debug localhost:5858` to connect to the debugger when it stops.
	#
	# Better, run node_modules/.bin/node-inspector first, then run `make
	# debugtest`, then open http://127.0.0.1:8080/debug?port=5858 in Chrome.

.PHONY: all debug lint test
