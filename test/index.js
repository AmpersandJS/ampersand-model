var test = require('tape');
var Sync = require('ampersand-sync');
var AmpersandModel = require('../ampersand-model');

var SuccessSync = function (method, model, options) {
    options.xhrImplementation = function (xhrOptions) {
        setTimeout(function () {
            xhrOptions.success();
        }, 100);
        return {};
    };
    return Sync.call(this, method, model, options);
};

test("url when using urlRoot, and uri encoding", function (t) {
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

test("url when using urlRoot as a function to determine urlRoot at runtime", function (t) {
    var Model = AmpersandModel.extend({
        props: {
            id: 'number',
            parent_id: 'number'
        },
        urlRoot: function () {
            return '/nested/' + this.get('parent_id') + '/collection';
        }
    });
    var model = new Model({parent_id: 1});
    t.equal(model.url(), '/nested/1/collection');
    model.set({id: 2});
    t.equal(model.url(), '/nested/1/collection/2');
    t.end();
});

test("has xhr on fetch/save/destroy", function (t) {
    t.plan(3);
    var Model = AmpersandModel.extend({
        props: {
            id: 'number'
        },
        sync: SuccessSync,
        urlRoot: 'fake/url'
    });
    var model = new Model({id: 1});
    model.on('sync', function (model, resp, options) {
        t.ok(options.xhr);
    });
    model.fetch();
    model.save();
    model.destroy();
});
