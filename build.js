var fs = require('fs');
var uglify = require('uglify-js');

fs.writeFileSync('strict.min.js', uglify.minify('strictmodel.js').code);
