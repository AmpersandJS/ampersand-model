var fs = require('fs');
var uglify = require('uglify-js');

fs.writeFileSync('human-model.min.js', uglify.minify('human-model.js').code);
