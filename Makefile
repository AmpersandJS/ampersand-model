SHELL := /bin/bash

# UglifyJS v1.3.4
min:
	@echo -n ';' > strictmodel.min.js; uglifyjs strictmodel.js >> strictmodel.min.js;

.PHONY: test hint min

