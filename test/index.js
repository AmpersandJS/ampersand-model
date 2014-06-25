var test = require('tape');
var AmpersandModel = require('../ampersand-model');


test("url when using urlRoot, and uri encoding", function(t) {
    var Model = AmpersandModel.extend({
        props: {
            id: 'string'
        },
        urlRoot: '/collection'
    });
    var model = new Model();
    t.equal(model.url(), '/collection');
    model.set({id: '+1+'});
    t.equal(model.url(), '/collection/%2B1%2B');
    t.end();
});

test("url when using urlRoot as a function to determine urlRoot at runtime", function(t) {
    var Model = AmpersandModel.extend({
        props: {
            id: 'number',
            parent_id: 'number'
        },
        urlRoot: function() {
            return '/nested/' + this.get('parent_id') + '/collection';
        }
    });
    var model = new Model({parent_id: 1});
    t.equal(model.url(), '/nested/1/collection');
    model.set({id: 2});
    t.equal(model.url(), '/nested/1/collection/2');
    t.end();
});

