/* global console */
var _ = require('underscore');

var tape = require('tape');
var test = tape;

//qunit has equal/strictEqual, we just have equal
tape.Test.prototype.strictEqual = function () {
    this.equal.apply(this, arguments);
};

tape.skip = function (name) {
    console.log('SKIPPING', name);
};

//stub qunit module
function module(moduleName, opts) {
    test = function (testName, cb) {
        if (opts.setup) opts.setup();
        tape.call(tape, moduleName + ' - ' + testName, cb);
    };

    test.only = function (testName, cb) {
        if (opts.setup) opts.setup();
        tape.only.call(tape, moduleName + ' - ' + testName, cb);
    };

    test.skip = tape.skip;
}

var AmpersandModel = require('../ampersand-model');
//Let's fake some backbone things to minimize test changes
var env = {};
var Backbone = {
    Model: AmpersandModel.extend({
        extraProperties: 'allow',
        sync: function (method, model, options) {
            env.syncArgs = {
                method: method,
                model: model,
                options: options
            };
        }
    }),
    Collection: {
        extend: function (o) {
            var Coll = function () {
                var k;
                for (k in o) {
                    this[k] = o[k];
                }
            };
            Coll.prototype.add = function (m) {
                m.collection = this;
            };
            return Coll;
        }
    }
};

(function () {

    var proxy = Backbone.Model.extend();
    var klass = Backbone.Collection.extend({
        url : function () { return '/collection'; }
    });
    var doc, collection;

    module("Backbone.Model", {

        setup: function () {
            doc = new proxy({
                id     : '1-the-tempest',
                title  : "The Tempest",
                author : "Bill Shakespeare",
                textLength : 123
            });
            collection = new klass();
            collection.add(doc);
        }

    });

    test("initialize", function (t) {
        t.plan(3);
        var Model = Backbone.Model.extend({
            initialize: function () {
                this.one = 1;
                t.equal(this.collection, collection);
            }
        });
        var model = new Model({}, {collection: collection});
        t.equal(model.one, 1);
        t.equal(model.collection, collection);
    });

    test("initialize with attributes and options", function (t) {
        t.plan(1);
        var Model = Backbone.Model.extend({
            initialize: function (attributes, options) {
                this.one = options.one;
            }
        });
        var model = new Model({}, {one: 1});
        t.equal(model.one, 1);
    });

    test("initialize with parsed attributes", function (t) {
        t.plan(1);
        var Model = Backbone.Model.extend({
            parse: function (attrs) {
                attrs.value += 1;
                return attrs;
            }
        });
        var model = new Model({value: 1}, {parse: true});
        t.equal(model.get('value'), 2);
    });

    test("initialize with defaults", function (t) {
        t.plan(2);
        var Model = Backbone.Model.extend({
            props: {
                first_name: ['string', true, 'Unknown'],
                last_name: ['string', true, 'Unknown']
            }
        });
        var model = new Model({'first_name': 'John'});
        t.equal(model.get('first_name'), 'John');
        t.equal(model.get('last_name'), 'Unknown');
    });

    test("parse can return null", function (t) {
        t.plan(1);
        var Model = Backbone.Model.extend({
            parse: function (attrs) {
                attrs.value += 1;
                return null;
            }
        });
        var model = new Model({value: 1}, {parse: true});
        t.equal(JSON.stringify(model.toJSON()), "{}");
    });

    test("url", function (t) {
        t.plan(3);
        doc.urlRoot = null;
        t.equal(doc.url(), '/collection/1-the-tempest');
        doc.collection.url = '/collection/';
        t.equal(doc.url(), '/collection/1-the-tempest');
        doc.collection = null;
        t.throws(function () { doc.url(); });
        doc.collection = collection;
    });

    test("url when using urlRoot, and uri encoding", function (t) {
        t.plan(2);
        var Model = Backbone.Model.extend({
            urlRoot: '/collection'
        });
        var model = new Model();
        t.equal(model.url(), '/collection');
        model.set({id: '+1+'});
        t.equal(model.url(), '/collection/%2B1%2B');
    });

    test("url when using urlRoot as a function to determine urlRoot at runtime", function (t) {
        t.plan(2);
        var Model = Backbone.Model.extend({
            urlRoot: function () {
                return '/nested/' + this.get('parent_id') + '/collection';
            }
        });

        var model = new Model({parent_id: 1});
        t.equal(model.url(), '/nested/1/collection');
        model.set({id: 2});
        t.equal(model.url(), '/nested/1/collection/2');
    });

    test.skip("underscore methods", function (t) {
        t.plan(5);
        var model = new Backbone.Model({ 'foo': 'a', 'bar': 'b', 'baz': 'c' });
        var model2 = model.clone();
        t.deepEqual(model.keys(), ['foo', 'bar', 'baz']);
        t.deepEqual(model.values(), ['a', 'b', 'c']);
        t.deepEqual(model.invert(), { 'a': 'foo', 'b': 'bar', 'c': 'baz' });
        t.deepEqual(model.pick('foo', 'baz'), {'foo': 'a', 'baz': 'c'});
        t.deepEqual(model.omit('foo', 'bar'), {'baz': 'c'});
    });

    test.skip("chain", function (t) {
        t.plan(1);
        var model = new Backbone.Model({ a: 0, b: 1, c: 2 });
        t.deepEqual(model.chain().pick("a", "b", "c").values().compact().value(), [1, 2]);
    });

    test.skip("clone", function (t) {
        t.plan(10);
        var a = new Backbone.Model({ 'foo': 1, 'bar': 2, 'baz': 3});
        var b = a.clone();
        t.equal(a.get('foo'), 1);
        t.equal(a.get('bar'), 2);
        t.equal(a.get('baz'), 3);
        t.equal(b.get('foo'), a.get('foo'), "Foo should be the same on the clone.");
        t.equal(b.get('bar'), a.get('bar'), "Bar should be the same on the clone.");
        t.equal(b.get('baz'), a.get('baz'), "Baz should be the same on the clone.");
        a.set({foo : 100});
        t.equal(a.get('foo'), 100);
        t.equal(b.get('foo'), 1, "Changing a parent attribute does not change the clone.");

        var foo = new Backbone.Model({p: 1});
        var bar = new Backbone.Model({p: 2});
        bar.set(foo.clone().attributes, {unset: true});
        t.equal(foo.get('p'), 1);
        t.equal(bar.get('p'), undefined);
    });

    test("isNew", function (t) {
        t.plan(6);
        var a = new Backbone.Model({ 'foo': 1, 'bar': 2, 'baz': 3});
        t.ok(a.isNew(), "it should be new");
        a = new Backbone.Model({ 'foo': 1, 'bar': 2, 'baz': 3, 'id': -5 });
        t.ok(!a.isNew(), "any defined ID is legal, negative or positive");
        a = new Backbone.Model({ 'foo': 1, 'bar': 2, 'baz': 3, 'id': 0 });
        t.ok(!a.isNew(), "any defined ID is legal, including zero");
        t.ok(new Backbone.Model({          }).isNew(), "is true when there is no id");
        t.ok(!new Backbone.Model({ 'id': 2  }).isNew(), "is false for a positive integer");
        t.ok(!new Backbone.Model({ 'id': -5 }).isNew(), "is false for a negative integer");
    });

    test("get", function (t) {
        t.plan(2);
        t.equal(doc.get('title'), 'The Tempest');
        t.equal(doc.get('author'), 'Bill Shakespeare');
    });

    test("escape", function (t) {
        t.plan(5);
        t.equal(doc.escape('title'), 'The Tempest');
        doc.set({audience: 'Bill & Bob'});
        t.equal(doc.escape('audience'), 'Bill &amp; Bob');
        doc.set({audience: 'Tim > Joan'});
        t.equal(doc.escape('audience'), 'Tim &gt; Joan');
        doc.set({audience: 10101});
        t.equal(doc.escape('audience'), '10101');
        doc.unset('audience');
        t.equal(doc.escape('audience'), '');
    });

    test.skip("has", function (t) {
        t.plan(10);
        var model = new Backbone.Model();

        t.strictEqual(model.has('name'), false);

        model.set({
            '0': 0,
            '1': 1,
            'true': true,
            'false': false,
            'empty': '',
            'name': 'name',
            'null': null,
            'undefined': undefined
        });

        t.strictEqual(model.has('0'), true);
        t.strictEqual(model.has('1'), true);
        t.strictEqual(model.has('true'), true);
        t.strictEqual(model.has('false'), true);
        t.strictEqual(model.has('empty'), true);
        t.strictEqual(model.has('name'), true);

        model.unset('name');

        t.strictEqual(model.has('name'), false);
        t.strictEqual(model.has('null'), false);
        t.strictEqual(model.has('undefined'), false);
    });

    test("set and unset", function (t) {
        t.plan(8);
        var a = new Backbone.Model({id: 'id', foo: 1, bar: 2, baz: 3});
        var changeCount = 0;
        a.on("change:foo", function () { changeCount += 1; });
        a.set({'foo': 2});
        t.ok(a.get('foo') == 2, "Foo should have changed.");
        t.ok(changeCount == 1, "Change count should have incremented.");
        a.set({'foo': 2}); // set with value that is not new shouldn't fire change event
        t.ok(a.get('foo') == 2, "Foo should NOT have changed, still 2");
        t.ok(changeCount == 1, "Change count should NOT have incremented.");

        a.validate = function (attrs) {
            t.equal(attrs.foo, void 0, "validate:true passed while unsetting");
        };
        a.unset('foo', {validate: true});
        t.equal(a.get('foo'), void 0, "Foo should have changed");
        delete a.validate;
        t.ok(changeCount == 2, "Change count should have incremented for unset.");

        a.unset('id');
        t.equal(a.id, undefined, "Unsetting the id should remove the id property.");
    });

    test("#2030 - set with failed validate, followed by another set triggers change", function (t) {
        t.plan(1);
        var attr = 0, main = 0, error = 0;
        var Model = Backbone.Model.extend({
            validate: function (attr) {
                if (attr.x > 1) {
                    error++;
                    return "this is an error";
                }
            }
        });
        var model = new Model({x: 0});
        model.on('change:x', function () { attr++; });
        model.on('change', function () { main++; });
        model.set({x: 2}, {validate: true});
        model.set({x: 1}, {validate: true});
        t.deepEqual([attr, main, error], [1, 1, 1]);
    });

    test("set triggers changes in the correct order", function (t) {
        t.plan(1);
        var value = null;
        var model = new Backbone.Model();
        model.on('last', function () { value = 'last'; });
        model.on('first', function () { value = 'first'; });
        model.trigger('first');
        model.trigger('last');
        t.equal(value, 'last');
    });

    test("set falsy values in the correct order", function (t) {
        t.plan(2);
        var model = new Backbone.Model({result: 'result'});
        model.on('change', function () {
            t.equal(model._changed.result, void 0);
            t.equal(model.previous('result'), false);
        });
        model.set({result: void 0}, {silent: true});
        model.set({result: null}, {silent: true});
        model.set({result: false}, {silent: true});
        model.set({result: void 0});
    });

    test.skip("nested set triggers with the correct options", function (t) {
        t.plan(3);
        var model = new Backbone.Model();
        var o1 = {};
        var o2 = {};
        var o3 = {};
        model.on('change', function (__, options) {
            switch (model.get('a')) {
                case 1:
                    t.equal(options, o1);
                    return model.set('a', 2, o2);
                case 2:
                    t.equal(options, o2);
                    return model.set('a', 3, o3);
                case 3:
                    t.equal(options, o3);
            }
        });
        model.set('a', 1, o1);
    });

    test("multiple unsets", function (t) {
        t.plan(1);
        var i = 0;
        var counter = function () { i++; };
        var model = new Backbone.Model({a: 1});
        model.on("change:a", counter);
        model.set({a: 2});
        model.unset('a');
        model.unset('a');
        t.equal(i, 2, 'Unset does not fire an event for missing attributes.');
    });

    test("unset and changedAttributes", function (t) {
        t.plan(1);
        var model = new Backbone.Model({a: 1});
        model.on('change', function () {
            t.ok('a' in model.changedAttributes(), 'changedAttributes should contain unset properties');
        });
        model.unset('a');
    });

    test.skip("using a non-default id attribute.", function (t) {
        t.plan(5);
        var MongoModel = Backbone.Model.extend({idAttribute : '_id'});
        var model = new MongoModel({id: 'eye-dee', _id: 25, title: 'Model'});
        t.equal(model.get('id'), 'eye-dee');
        t.equal(model.id, 25);
        t.equal(model.isNew(), false);
        model.unset('_id');
        t.equal(model.id, undefined);
        t.equal(model.isNew(), true);
    });

    test("set an empty string", function (t) {
        t.plan(1);
        var model = new Backbone.Model({name : "Model"});
        model.set({name : ''});
        t.equal(model.get('name'), '');
    });

    test("setting an object", function (t) {
        t.plan(1);
        var model = new Backbone.Model({
            custom: { foo: 1 }
        });
        model.on('change', function () {
            t.ok(1);
        });
        model.set({
            custom: { foo: 1 } // no change should be fired
        });
        model.set({
            custom: { foo: 2 } // change event should be fired
        });
    });

    test.skip("clear", function (t) {
        t.plan(3);
        var changed;
        var model = new Backbone.Model({id: 1, name : "Model"});
        model.on("change:name", function () { changed = true; });
        model.on("change", function () {
            var changedAttrs = model.changedAttributes();
            t.ok('name' in changedAttrs);
        });
        model.clear();
        t.equal(changed, true);
        t.equal(model.get('name'), undefined);
    });

    test.skip("defaults", function (t) {
        t.plan(4);
        var Defaulted = Backbone.Model.extend({
            props: {
                "one": ['number', true, 1],
                "two": ['number', true, 2]
            }
        });
        var model = new Defaulted({two: undefined});
        t.equal(model.get('one'), 1);
        t.equal(model.get('two'), 2);
        Defaulted = Backbone.Model.extend({
            props: {
                "one": ['number', true, 3],
                "two": ['number', true, 4]
            }
        });
        model = new Defaulted({two: undefined});
        t.equal(model.get('one'), 3);
        t.equal(model.get('two'), 4);
    });

    test("change, hasChanged, changedAttributes, previous, previousAttributes", function (t) {
        t.plan(9);
        var model = new Backbone.Model({name: "Tim", age: 10});
        t.deepEqual(model.changedAttributes(), false);
        model.on('change', function () {
            t.ok(model.hasChanged('name'), 'name changed');
            t.ok(!model.hasChanged('age'), 'age did not');
            t.ok(_.isEqual(model.changedAttributes(), {name : 'Rob'}), 'changedAttributes returns the changed attrs');
            t.equal(model.previous('name'), 'Tim');
            t.ok(_.isEqual(model.previousAttributes(), {name : "Tim", age : 10}), 'previousAttributes is correct');
        });
        t.equal(model.hasChanged(), false);
        t.equal(model.hasChanged(undefined), false);
        model.set({name : 'Rob'});
        t.equal(model.get('name'), 'Rob');
    });

    test("changedAttributes", function (t) {
        t.plan(3);
        var model = new Backbone.Model({a: 'a', b: 'b'});
        t.deepEqual(model.changedAttributes(), false);
        t.equal(model.changedAttributes({a: 'a'}), false);
        t.equal(model.changedAttributes({a: 'b'}).a, 'b');
    });

    test("change with options", function (t) {
        t.plan(2);
        var value;
        var model = new Backbone.Model({name: 'Rob'});
        model.on('change', function (model, options) {
            value = options.prefix + model.get('name');
        });
        model.set({name: 'Bob'}, {prefix: 'Mr. '});
        t.equal(value, 'Mr. Bob');
        model.set({name: 'Sue'}, {prefix: 'Ms. '});
        t.equal(value, 'Ms. Sue');
    });

    test("change after initialize", function (t) {
        t.plan(1);
        var changed = 0;
        var attrs = {id: 1, label: 'c'};
        var obj = new Backbone.Model(attrs);
        obj.on('change', function () { changed += 1; });
        obj.set(attrs);
        t.equal(changed, 0);
    });

    test("save within change event", function (t) {
        t.plan(1);
        //var env = this;
        var model = new Backbone.Model({firstName : "Taylor", lastName: "Swift"});
        model.url = '/test';
        model.on('change', function () {
            model.save();
            t.ok(_.isEqual(env.syncArgs.model, model));
        });
        model.set({lastName: 'Hicks'});
    });

    test("validate after save", function (t) {
        t.plan(2);
        var lastError, model = new Backbone.Model();
        model.validate = function (attrs) {
            if (attrs.admin) return "Can't change admin status.";
        };
        model.sync = function (method, model, options) {
            options.success.call(this, {admin: true});
        };
        model.on('invalid', function (model, error) {
            lastError = error;
        });
        model.save(null);

        t.equal(lastError, "Can't change admin status.");
        t.equal(model.validationError, "Can't change admin status.");
    });

    test("save", function (t) {
        t.plan(2);
        doc.save({title : "Henry V"});
        t.equal(env.syncArgs.method, 'update');
        t.ok(_.isEqual(env.syncArgs.model, doc));
    });

    test("save, fetch, destroy triggers error event when an error occurs", function (t) {
        t.plan(3);
        var model = new Backbone.Model();
        model.on('error', function () {
            t.ok(true);
        });
        model.sync = function (method, model, options) {
            options.error();
        };
        model.save({data: 2, id: 1});
        model.fetch();
        model.destroy();
    });

    test.skip("save with PATCH", function (t) {
        t.plan(7);
        doc.clear().set({id: 1, a: 1, b: 2, c: 3, d: 4});
        doc.save();
        t.equal(env.syncArgs.method, 'update');
        t.equal(env.syncArgs.options.attrs, undefined);

        doc.save({b: 2, d: 4}, {patch: true});
        t.equal(env.syncArgs.method, 'patch');
        t.equal(_.size(env.syncArgs.options.attrs), 2);
        t.equal(env.syncArgs.options.attrs.d, 4);
        t.equal(env.syncArgs.options.attrs.a, undefined);
        t.equal(this.ajaxSettings.data, "{\"b\":2,\"d\":4}");
    });

    test.skip("save in positional style", function (t) {
        t.plan(1);
        var model = new Backbone.Model();
        model.sync = function (method, model, options) {
            options.success();
        };
        model.save('title', 'Twelfth Night');
        t.equal(model.get('title'), 'Twelfth Night');
    });

    test.skip("save with non-object success response", function (t) {
        t.plan(2);
        var model = new Backbone.Model();
        model.sync = function (method, model, options) {
            options.success('', options);
            options.success(null, options);
        };
        model.save({testing: 'empty'}, {
            success: function (model) {
                t.deepEqual(model.attributes, {testing: 'empty'});
            }
        });
    });

    test.skip("fetch", function (t) {
        t.plan(2);
        doc.fetch();
        t.equal(this.syncArgs.method, 'read');
        t.ok(_.isEqual(this.syncArgs.model, doc));
    });

    test.skip("destroy", function (t) {
        t.plan(3);
        doc.destroy();
        t.equal(this.syncArgs.method, 'delete');
        t.ok(_.isEqual(this.syncArgs.model, doc));

        var newModel = new Backbone.Model();
        t.equal(newModel.destroy(), false);
    });

    test("non-persisted destroy", function (t) {
        t.plan(1);
        var a = new Backbone.Model({ 'foo': 1, 'bar': 2, 'baz': 3});
        a.sync = function () { throw "should not be called"; };
        a.destroy();
        t.ok(true, "non-persisted model should not call sync");
    });

    test("validate", function (t) {
        t.plan(7);
        var lastError;
        var model = new Backbone.Model();
        model.validate = function (attrs) {
            if (attrs.admin != this.get('admin')) return "Can't change admin status.";
        };
        model.on('invalid', function (model, error) {
            lastError = error;
        });
        var result = model.set({a: 100});
        t.equal(result, model);
        t.equal(model.get('a'), 100);
        t.equal(lastError, undefined);
        result = model.set({admin: true});
        t.equal(model.get('admin'), true);
        result = model.set({a: 200, admin: false}, {validate: true});
        t.equal(lastError, "Can't change admin status.");
        t.equal(result, false);
        t.equal(model.get('a'), 100);
    });

    test("validate on unset and clear", function (t) {
        t.plan(6);
        var error;
        var model = new Backbone.Model({name: "One"});
        model.validate = function (attrs) {
            if (!attrs.name) {
                error = true;
                return "No thanks.";
            }
        };
        model.set({name: "Two"});
        t.equal(model.get('name'), 'Two');
        t.equal(error, undefined);
        model.unset('name', {validate: true});
        t.equal(error, true);
        t.equal(model.get('name'), 'Two');
        model.clear({validate: true});
        t.equal(model.get('name'), 'Two');
        delete model.validate;
        model.clear();
        t.equal(model.get('name'), undefined);
    });

    test("validate with error callback", function (t) {
        t.plan(8);
        var lastError, boundError;
        var model = new Backbone.Model();
        model.validate = function (attrs) {
            if (attrs.admin) return "Can't change admin status.";
        };
        model.on('invalid', function (model, error) {
            boundError = true;
        });
        var result = model.set({a: 100}, {validate: true});
        t.equal(result, model);
        t.equal(model.get('a'), 100);
        t.equal(model.validationError, null);
        t.equal(boundError, undefined);
        result = model.set({a: 200, admin: true}, {validate: true});
        t.equal(result, false);
        t.equal(model.get('a'), 100);
        t.equal(model.validationError, "Can't change admin status.");
        t.equal(boundError, true);
    });

    test("defaults always extend attrs (#459)", function (t) {
        t.plan(2);
        var Defaulted = Backbone.Model.extend({
            props: {
                one: ['number', true, 1]
            },
            initialize : function (attrs, opts) {
                t.equal(this.attributes.one, 1);
            }
        });
        var providedattrs = new Defaulted({});
        var emptyattrs = new Defaulted();
    });

    test.skip("Inherit class properties", function (t) {
        t.plan(6);
        var Parent = Backbone.Model.extend({
            instancePropSame: function () {},
            instancePropDiff: function () {}
        }, {
            classProp: function () {}
        });
        var Child = Parent.extend({
            instancePropDiff: function () {}
        });

        var adult = new Parent();
        var kid   = new Child();

        t.equal(Child.classProp, Parent.classProp);
        t.notEqual(Child.classProp, undefined);

        t.equal(kid.instancePropSame, adult.instancePropSame);
        t.notEqual(kid.instancePropSame, undefined);

        t.notEqual(Child.prototype.instancePropDiff, Parent.prototype.instancePropDiff);
        t.notEqual(Child.prototype.instancePropDiff, undefined);
    });

    test("Nested change events don't clobber previous attributes", function (t) {
        t.plan(4);
        new Backbone.Model()
        .on('change:state', function (model, newState) {
            t.equal(model.previous('state'), undefined);
            t.equal(newState, 'hello');
            // Fire a nested change event.
            model.set({other: 'whatever'});
        })
        .on('change:state', function (model, newState) {
            t.equal(model.previous('state'), undefined);
            t.equal(newState, 'hello');
        })
        .set({state: 'hello'});
    });

    test("hasChanged/set should use same comparison", function (t) {
        t.plan(2);
        var changed = 0, model = new Backbone.Model({a: null});
        model.on('change', function () {
            t.ok(this.hasChanged('a'));
        })
        .on('change:a', function () {
            changed++;
        })
        .set({a: undefined});
        t.equal(changed, 1);
    });

    test("#582, #425, change:attribute callbacks should fire after all changes have occurred", function (t) {
        t.plan(9);
        var model = new Backbone.Model();

        var assertion = function () {
            t.equal(model.get('a'), 'a');
            t.equal(model.get('b'), 'b');
            t.equal(model.get('c'), 'c');
        };

        model.on('change:a', assertion);
        model.on('change:b', assertion);
        model.on('change:c', assertion);

        model.set({a: 'a', b: 'b', c: 'c'});
    });

    test.skip("#871, set with attributes property", function (t) {
        t.plan(1);
        var model = new Backbone.Model();
        model.set({attributes: true});
        t.ok(model.has('attributes'));
    });

    test.skip("set value regardless of equality/change", function (t) {
        t.plan(1);
        var model = new Backbone.Model({x: []});
        var a = [];
        model.set({x: a});
        t.ok(model.get('x') === a);
    });

    test("set same value does not trigger change", function (t) {
        var model = new Backbone.Model({x: 1});
        model.on('change change:x', function () {
            t.ok(false);
        });
        model.set({x: 1});
        model.set({x: 1});
        t.end();
    });

    test("unset does not fire a change for undefined attributes", function (t) {
        var model = new Backbone.Model({x: undefined});
        model.on('change:x', function () { t.ok(false); });
        model.unset('x');
        t.end();
    });

    test.skip("set: undefined values", function (t) {
        t.plan(1);
        var model = new Backbone.Model({x: undefined});
        t.ok('x' in model.attributes);
    });

    test("hasChanged works outside of change events, and true within", function (t) {
        t.plan(6);
        var model = new Backbone.Model({x: 1});
        model.on('change:x', function () {
            t.ok(model.hasChanged('x'));
            t.equal(model.get('x'), 1);
        });
        model.set({x: 2}, {silent: true});
        t.ok(model.hasChanged());
        t.equal(model.hasChanged('x'), true);
        model.set({x: 1});
        t.ok(model.hasChanged());
        t.equal(model.hasChanged('x'), true);
    });

    test("hasChanged gets cleared on the following set", function (t) {
        t.plan(4);
        var model = new Backbone.Model();
        model.set({x: 1});
        t.ok(model.hasChanged());
        model.set({x: 1});
        t.ok(!model.hasChanged());
        model.set({x: 2});
        t.ok(model.hasChanged());
        model.set({});
        t.ok(!model.hasChanged());
    });

    test.skip("save with `wait` succeeds without `validate`", function (t) {
        t.plan(1);
        var model = new Backbone.Model();
        model.url = '/test';
        model.save({x: 1}, {wait: true});
        t.ok(this.syncArgs.model === model);
    });

    test.skip("save without `wait` doesn't set invalid attributes", function (t) {
        t.plan(1);
        var model = new Backbone.Model();
        model.validate = function () { return 1; };
        model.save({a: 1});
        t.equal(model.get('a'), void 0);
    });

    test.skip("save doesn't validate twice", function (t) {
        t.plan(1);
        var model = new Backbone.Model();
        var times = 0;
        model.sync = function () {};
        model.validate = function () { ++times; };
        model.save({});
        t.equal(times, 1);
    });

    test("`hasChanged` for falsey keys", function (t) {
        t.plan(2);
        var model = new Backbone.Model();
        model.set({x: true}, {silent: true});
        t.ok(!model.hasChanged(0));
        t.ok(!model.hasChanged(''));
    });

    test("`previous` for falsey keys", function (t) {
        t.plan(2);
        var model = new Backbone.Model({0: true, '': true});
        model.set({0: false, '': false}, {silent: true});
        t.equal(model.previous(0), true);
        t.equal(model.previous(''), true);
    });

    test.skip("`save` with `wait` sends correct attributes", function (t) {
        t.plan(5);
        var changed = 0;
        var model = new Backbone.Model({x: 1, y: 2});
        model.url = '/test';
        model.on('change:x', function () { changed++; });
        model.save({x: 3}, {wait: true});
        t.deepEqual(JSON.parse(this.ajaxSettings.data), {x: 3, y: 2});
        t.equal(model.get('x'), 1);
        t.equal(changed, 0);
        this.syncArgs.options.success({});
        t.equal(model.get('x'), 3);
        t.equal(changed, 1);
    });

    test.skip("a failed `save` with `wait` doesn't leave attributes behind", function (t) {
        t.plan(1);
        var model = new Backbone.Model();
        model.url = '/test';
        model.save({x: 1}, {wait: true});
        t.equal(model.get('x'), void 0);
    });

    test.skip("#1030 - `save` with `wait` results in correct attributes if success is called during sync", function (t) {
        t.plan(2);
        var model = new Backbone.Model({x: 1, y: 2});
        model.sync = function (method, model, options) {
            options.success();
        };
        model.on("change:x", function () { t.ok(true); });
        model.save({x: 3}, {wait: true});
        t.equal(model.get('x'), 3);
    });

    test.skip("save with wait validates attributes", function (t) {
        t.plan(1);
        var model = new Backbone.Model();
        model.url = '/test';
        model.validate = function () { t.ok(true); };
        model.save({x: 1}, {wait: true});
    });

    test.skip("save turns on parse flag", function (t) {
        t.plan(1);
        var Model = Backbone.Model.extend({
            sync: function (method, model, options) { t.ok(options.parse); }
        });
        new Model().save();
    });

    test("nested `set` during `'change:attr'`", function (t) {
        t.plan(2);
        var events = [];
        var model = new Backbone.Model();
        model.on('all', function (event) { events.push(event); });
        model.on('change', function () {
            model.set({z: true}, {silent: true});
        });
        model.on('change:x', function () {
            model.set({y: true});
        });
        model.set({x: true});
        t.deepEqual(events, ['change:y', 'change:x', 'change']);
        events = [];
        model.set({z: true});
        t.deepEqual(events, []);
    });

    test("nested `change` only fires once", function (t) {
        t.plan(1);
        var model = new Backbone.Model();
        model.on('change', function () {
            t.ok(true);
            model.set({x: true});
        });
        model.set({x: true});
    });

    test("nested `set` during `'change'`", function (t) {
        t.plan(6);
        var count = 0;
        var model = new Backbone.Model();
        model.on('change', function () {
            switch (count++) {
                case 0:
                    t.deepEqual(this.changedAttributes(), {x: true});
                    t.equal(model.previous('x'), undefined);
                    model.set({y: true});
                    break;
                case 1:
                    t.deepEqual(this.changedAttributes(), {x: true, y: true});
                    t.equal(model.previous('x'), undefined);
                    model.set({z: true});
                    break;
                case 2:
                    t.deepEqual(this.changedAttributes(), {x: true, y: true, z: true});
                    t.equal(model.previous('y'), undefined);
                    break;
                default:
                    t.ok(false);
            }
        });
        model.set({x: true});
    });

    test("nested `change` with silent", function (t) {
        t.plan(3);
        var count = 0;
        var model = new Backbone.Model();
        model.on('change:y', function () { t.ok(false); });
        model.on('change', function () {
            switch (count++) {
                case 0:
                    t.deepEqual(this.changedAttributes(), {x: true});
                    model.set({y: true}, {silent: true});
                    model.set({z: true});
                    break;
                case 1:
                    t.deepEqual(this.changedAttributes(), {x: true, y: true, z: true});
                    break;
                case 2:
                    t.deepEqual(this.changedAttributes(), {z: false});
                    break;
                default:
                    t.ok(false);
            }
        });
        model.set({x: true});
        model.set({z: false});
    });

    test("nested `change:attr` with silent", function (t) {
        var model = new Backbone.Model();
        model.on('change:y', function () { t.ok(false); });
        model.on('change', function () {
            model.set({y: true}, {silent: true});
            model.set({z: true});
        });
        model.set({x: true});
        t.end();
    });

    test("multiple nested changes with silent", function (t) {
        t.plan(1);
        var model = new Backbone.Model();
        model.on('change:x', function () {
            model.set({y: 1}, {silent: true});
            model.set({y: 2});
        });
        model.on('change:y', function (model, val) {
            t.equal(val, 2);
        });
        model.set({x: true});
    });

    test("multiple nested changes with silent", function (t) {
        t.plan(1);
        var changes = [];
        var model = new Backbone.Model();
        model.on('change:b', function (model, val) { changes.push(val); });
        model.on('change', function () {
            model.set({b: 1});
        });
        model.set({b: 0});
        t.deepEqual(changes, [0, 1]);
    });

    test("basic silent change semantics", function (t) {
        t.plan(1);
        var model = new Backbone.Model();
        model.set({x: 1});
        model.on('change', function () { t.ok(true); });
        model.set({x: 2}, {silent: true});
        model.set({x: 1});
    });

    test("nested set multiple times", function (t) {
        t.plan(1);
        var model = new Backbone.Model();
        model.on('change:b', function () {
            t.ok(true);
        });
        model.on('change:a', function () {
            model.set({b: true});
            model.set({b: true});
        });
        model.set({a: true});
    });

    test("#1122 - clear does not alter options.", function (t) {
        t.plan(1);
        var model = new Backbone.Model();
        var options = {};
        model.clear(options);
        t.ok(!options.unset);
    });

    test("#1122 - unset does not alter options.", function (t) {
        t.plan(1);
        var model = new Backbone.Model({x: 1});
        var options = {};
        model.unset('x', options);
        t.ok(!options.unset);
    });

    test("#1355 - `options` is passed to success callbacks", function (t) {
        t.plan(3);
        var model = new Backbone.Model();
        var opts = {
            success: function (model, resp, options) {
                t.ok(options);
            }
        };
        model.sync = function (method, model, options) {
            options.success();
        };
        model.save({id: 1}, opts);
        model.fetch(opts);
        model.destroy(opts);
    });

    test("#1412 - Trigger 'sync' event.", function (t) {
        t.plan(3);
        var model = new Backbone.Model({id: 1});
        model.sync = function (method, model, options) { options.success(); };
        model.on('sync', function () { t.ok(true); });
        model.fetch();
        model.save();
        model.destroy();
    });

    test("#1365 - Destroy: New models execute success callback.", function (t) {
        t.plan(2);
        new Backbone.Model()
        .on('sync', function () { t.ok(false); })
        .on('destroy', function () { t.ok(true); })
        .destroy({ success: function () { t.ok(true); }});
    });

    test("#1433 - Save: An invalid model cannot be persisted.", function (t) {
        t.plan(1);
        var model = new Backbone.Model();
        model.validate = function () { return 'invalid'; };
        model.sync = function () { t.ok(false); };
        t.strictEqual(model.save(), false);
    });

    test("#1377 - Save without attrs triggers 'error'.", function (t) {
        t.plan(1);
        var Model = Backbone.Model.extend({
            url: '/test/',
            sync: function (method, model, options) { options.success(); },
            validate: function () { return 'invalid'; }
        });
        var model = new Model({id: 1});
        model.on('invalid', function () { t.ok(true); });
        model.save();
    });

    test("#1545 - `undefined` can be passed to a model constructor without coersion", function (t) {
        var Model = Backbone.Model.extend({
            defaults: { one: 1 },
            initialize : function (attrs, opts) {
                t.equal(attrs, undefined);
            }
        });
        var emptyattrs = new Model();
        var undefinedattrs = new Model(undefined);
        t.end();
    });

    test("#1478 - Model `save` does not trigger change on unchanged attributes", function (t) {
        var Model = Backbone.Model.extend({
            sync: function (method, model, options) {
                setTimeout(function () {
                    options.success();
                    t.end();
                }, 0);
            }
        });
        new Model({x: true})
        .on('change:x', function () { t.ok(false); })
        .save(null, {wait: true});
    });

    test("#1664 - Changing from one value, silently to another, back to original triggers a change.", function (t) {
        t.plan(1);
        var model = new Backbone.Model({x: 1});
        model.on('change:x', function () { t.ok(true); });
        model.set({x: 2}, {silent: true});
        model.set({x: 3}, {silent: true});
        model.set({x: 1});
    });

    test("#1664 - multiple silent changes nested inside a change event", function (t) {
        t.plan(2);
        var changes = [];
        var model = new Backbone.Model();
        model.on('change', function () {
            model.set({a: 'c'}, {silent: true});
            model.set({b: 2}, {silent: true});
            model.unset('c', {silent: true});
        });
        model.on('change:a change:b change:c', function (model, val) { changes.push(val); });
        model.set({a: 'a', b: 1, c: 'item'});
        t.deepEqual(changes, ['a', 1, 'item']);
        t.deepEqual(model.attributes, {a: 'c', b: 2});
    });

    test("#1791 - `attributes` is available for `parse`", function (t) {
        var Model = Backbone.Model.extend({
            parse: function () { this.attributes; } // shouldn't throw an error
        });
        var model = new Model(null, {parse: true});
        t.end();
    });

    test("silent changes in last `change` event back to original triggers change", function (t) {
        t.plan(2);
        var changes = [];
        var model = new Backbone.Model();
        model.on('change:a change:b change:c', function (model, val) { changes.push(val); });
        model.on('change', function () {
            model.set({a: 'c'}, {silent: true});
        });
        model.set({a: 'a'});
        t.deepEqual(changes, ['a']);
        model.set({a: 'a'});
        t.deepEqual(changes, ['a', 'a']);
    });

    test("#1943 change calculations should use _.isEqual", function (t) {
        t.plan(1);
        var model = new Backbone.Model({a: {key: 'value'}});
        model.set('a', {key: 'value'}, {silent: true});
        t.equal(model.changedAttributes(), false);
    });

    test("#1964 - final `change` event is always fired, regardless of interim changes", function (t) {
        t.plan(1);
        var model = new Backbone.Model();
        model.on('change:property', function () {
            model.set('property', 'bar');
        });
        model.on('change', function () {
            t.ok(true);
        });
        model.set('property', 'foo');
    });

    test("isValid", function (t) {
        t.plan(5);
        var model = new Backbone.Model({valid: true});
        model.validate = function (attrs) {
            if (!attrs.valid) return "invalid";
        };
        t.equal(model.isValid(), true);
        t.equal(model.set({valid: false}, {validate: true}), false);
        t.equal(model.isValid(), true);
        model.set({valid: false});
        t.equal(model.isValid(), false);
        t.ok(!model.set('valid', false, {validate: true}));
    });

    test("#1179 - isValid returns true in the absence of validate.", function (t) {
        t.plan(1);
        var model = new Backbone.Model();
        model.validate = null;
        t.ok(model.isValid());
    });

    test("#1961 - Creating a model with {validate:true} will call validate and use the error callback", function (t) {
        t.plan(1);
        var Model = Backbone.Model.extend({
            validate: function (attrs) {
                if (attrs.id === 1) return "This shouldn't happen";
            }
        });
        var model = new Model({id: 1}, {validate: true});
        t.equal(model.validationError, "This shouldn't happen");
    });

    test.skip("toJSON receives attrs during save(..., {wait: true})", function (t) {
        t.plan(1);
        var Model = Backbone.Model.extend({
            url: '/test',
            toJSON: function () {
                t.strictEqual(this.attributes.x, 1);
                return _.clone(this.attributes);
            }
        });
        var model = new Model();
        model.save({x: 1}, {wait: true});
    });

    test("#2034 - nested set with silent only triggers one change", function (t) {
        t.plan(1);
        var model = new Backbone.Model();
        model.on('change', function () {
            model.set({b: true}, {silent: true});
            t.ok(true);
        });
        model.set({a: true});
    });

})();
