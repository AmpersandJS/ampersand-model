SHELL := /bin/bash

test:
	@mocha -R spec test.js

hint:
	@jshint * --extra-ext .json

# UglifyJS v1.3.4
min:
	@echo -n ';' > strictmodel.min.js; uglifyjs strictmodel.js >> strictmodel.min.js;

.PHONY: test hint min

