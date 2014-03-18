var bundle = require('browserify')();
var fs = require('fs');
var uglify = require('uglify-js');
var pack = require('./package.json');


bundle.add('./ampersand-model');
bundle.bundle({standalone: 'AmpersandModel'}, function (err, source) {
    if (err) console.error(err);
    fs.writeFileSync('ampersand-model.bundle.js', source, 'utf-8');
    fs.writeFile('ampersand-model.min.js', uglify.minify(source, {fromString: true}).code, function (err) {
        if (err) throw err;
    });
});
