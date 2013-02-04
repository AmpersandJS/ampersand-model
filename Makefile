SHELL := /bin/bash

test:
	@mocha -R spec test.js

hint:
	@jshint * --extra-ext .json

# UglifyJS v1.3.4
min:
	@echo -n ';' > strict.min.js; uglifyjs -nc strict.js >> strict.min.js;

.PHONY: test hint min

