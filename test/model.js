/*
These are still here (despite being broken) because we may want to adapt them to work with tape.

They used to all pass when we ran this with QUnit, but things have obviously
been split out and re-shuffled a bit since then.
*/


$(document).ready(function() {

  var proxy = AmpersandModel.extend({
    props: {
      id: 'string',
      title: 'string',
      author: 'string',
      length: 'number',
      audience: 'string'
    }
  });
  var klass = Backbone.Collection.extend({
    url : function() { return '/collection'; }
  });
  var doc, collection;

  module("Backbone.Model", _.extend(new Environment, {

    setup: function() {
      Environment.prototype.setup.apply(this, arguments);
      doc = new proxy({
        id     : '1-the-tempest',
        title  : "The Tempest",
        author : "Bill Shakespeare",
        length : 123
      });
      collection = new klass();
      collection.add(doc);
    }

  }));

  test("save within change event", 1, function () {
    var env = this;
    var Model = AmpersandModel.extend({
      props: {
        firstName: 'string',
        lastName: 'string'
      }
    });
    var model = new Model({firstName : "Taylor", lastName: "Swift"});
    model.url = '/test';
    model.on('change', function () {
      model.save();
      ok(_.isEqual(env.syncArgs.model, model));
    });
    model.set({lastName: 'Hicks'});
  });

  test("validate after save", 2, function() {
    var lastError, model = new Backbone.Model();
    model.validate = function(attrs) {
      if (attrs.admin) return "Can't change admin status.";
    };
    model.sync = function(method, model, options) {
      options.success.call(this, {admin: true});
    };
    model.on('invalid', function(model, error) {
      lastError = error;
    });
    model.save(null);

    equal(lastError, "Can't change admin status.");
    equal(model.validationError, "Can't change admin status.");
  });

  test("save", 2, function() {
    doc.save({title : "Henry V"});
    equal(this.syncArgs.method, 'update');
    ok(_.isEqual(this.syncArgs.model, doc));
  });

  test("save, fetch, destroy triggers error event when an error occurs", 3, function () {
    var Model = AmpersandModel.extend({
      props: {
        data: 'number',
        id: 'number'
      }
    })
    var model = new Model();
    model.on('error', function () {
      ok(true);
    });
    model.sync = function (method, model, options) {
      options.error();
    };
    model.save({data: 2, id: 1});
    model.fetch();
    model.destroy();
  });

  test("save with PATCH", function() {
    var Model = AmpersandModel.extend({
      props: {
        id: 'number',
        title: 'string',
        author: 'string',
        length: 'number',
        a: 'number',
        b: 'number',
        c: 'number',
        d: 'number'
      }
    });
    var doc = new Model({
        id     :  1,
        title  : "The Tempest",
        author : "Bill Shakespeare",
        length : 123,
        a: 1,
        b: 2,
        c: 3,
        d: 4
      });

    collection = new klass();
    collection.add(doc);
    doc.save();
    equal(this.syncArgs.method, 'update');
    equal(this.syncArgs.options.attrs, undefined);

    doc.save({b: 2, d: 4}, {patch: true});
    equal(this.syncArgs.method, 'patch');
    equal(_.size(this.syncArgs.options.attrs), 2);
    equal(this.syncArgs.options.attrs.d, 4);
    equal(this.syncArgs.options.attrs.a, undefined);
    equal(this.ajaxSettings.data, "{\"b\":2,\"d\":4}");
  });

  test("save in positional style", 1, function() {
    var Model = AmpersandModel.extend({
      props: {
        title: 'string'
      }
    });
    var model = new Model();
    model.sync = function(method, model, options) {
      options.success();
    };
    model.save('title', 'Twelfth Night');
    equal(model.get('title'), 'Twelfth Night');
  });

  test("save with non-object success response", 2, function () {
    var Model = AmpersandModel.extend({
      props: {
        testing: 'string'
      }
    });
    var model = new Model();
    model.sync = function(method, model, options) {
      options.success('', options);
      options.success(null, options);
    };
    model.save({testing:'empty'}, {
      success: function (model) {
        deepEqual(model.attributes, {testing:'empty'});
      }
    });
  });

  test("fetch", 2, function() {
    doc.fetch();
    equal(this.syncArgs.method, 'read');
    ok(_.isEqual(this.syncArgs.model, doc));
  });

  test("destroy", 3, function() {
    doc.destroy();
    equal(this.syncArgs.method, 'delete');
    ok(_.isEqual(this.syncArgs.model, doc));

    var newModel = new Backbone.Model;
    equal(newModel.destroy(), false);
  });

  test("non-persisted destroy", 1, function() {
    var Model = AmpersandModel.extend({
      props: {
        foo: 'number',
        bar: 'number',
        baz: 'number'
      }
    });
    var a = new Model({ 'foo': 1, 'bar': 2, 'baz': 3});
    a.sync = function() { throw "should not be called"; };
    a.destroy();
    ok(true, "non-persisted model should not call sync");
  });

  test("save with `wait` succeeds without `validate`", 1, function() {
    var Model = AmpersandModel.extend({
      props: {
        x: 'number'
      }
    });
    var model = new Model();
    model.url = '/test';
    model.save({x: 1}, {wait: true});
    ok(this.syncArgs.model === model);
  });

  test("save without `wait` doesn't set invalid attributes", function () {
    var model = new Backbone.Model();
    model.validate = function () { return 1; }
    model.save({a: 1});
    equal(model.get('a'), void 0);
  });

  test("save doesn't validate twice", function () {
    var model = new Backbone.Model();
    var times = 0;
    model.sync = function () {};
    model.validate = function () { ++times; }
    model.save({});
    equal(times, 1);
  });

  test("`save` with `wait` sends correct attributes", 5, function() {
    var changed = 0;
    var Model = AmpersandModel.extend({
      props: {
        x: 'number',
        y: 'number'
      }
    });
    var model = new Model({x: 1, y: 2});
    model.url = '/test';
    model.on('change:x', function() { changed++; });
    model.save({x: 3}, {wait: true});
    deepEqual(JSON.parse(this.ajaxSettings.data), {x: 3, y: 2});
    equal(model.get('x'), 1);
    equal(changed, 0);
    this.syncArgs.options.success({});
    equal(model.get('x'), 3);
    equal(changed, 1);
  });


  test("a failed `save` with `wait` doesn't leave attributes behind", 1, function() {
    var Model = AmpersandModel.extend({
      props: {
        x: 'number'
      }
    });
    var model = new Model;
    model.url = '/test';
    model.save({x: 1}, {wait: true});
    equal(model.get('x'), void 0);
  });

  test("#1030 - `save` with `wait` results in correct attributes if success is called during sync", 2, function() {
    var Model = AmpersandModel.extend({
      props: {
        x: 'number',
        y: 'number'
      }
    });
    var model = new Model({x: 1, y: 2});
    model.sync = function(method, model, options) {
      options.success();
    };
    model.on("change:x", function() { ok(true); });
    model.save({x: 3}, {wait: true});
    equal(model.get('x'), 3);
  });

  test("save with wait validates attributes", function() {
    var model = new Backbone.Model();
    model.url = '/test';
    model.validate = function() { ok(true); };
    model.save({x: 1}, {wait: true});
  });

  test("save turns on parse flag", function () {
    var Model = AmpersandModel.extend({
      sync: function(method, model, options) { ok(options.parse); }
    });
    new Model().save();
  });

  test("#1355 - `options` is passed to success callbacks", 3, function() {
    var Model = AmpersandModel.extend({
      props: {
        id: 'number'
      }
    });
    var model = new Model();
    var opts = {
      success: function(model, resp, options) {
        ok(options);
      }
    };
    model.sync = function(method, model, options) {
      options.success();
    };
    model.save({id: 1}, opts);
    model.fetch(opts);
    model.destroy(opts);
  });

  test("#1412 - Trigger 'sync' event.", 3, function() {
    var Model = AmpersandModel.extend({
      props: {
        id: 'number'
      }
    });
    var model = new Model({id: 1});
    model.sync = function (method, model, options) { options.success(); };
    model.on('sync', function(){ ok(true); });
    model.fetch();
    model.save();
    model.destroy();
  });

  test("#1365 - Destroy: New models execute success callback.", 2, function() {
    new Backbone.Model()
    .on('sync', function() { ok(false); })
    .on('destroy', function(){ ok(true); })
    .destroy({ success: function(){ ok(true); }});
  });

  test("#1433 - Save: An invalid model cannot be persisted.", 1, function() {
    var model = new Backbone.Model;
    model.validate = function(){ return 'invalid'; };
    model.sync = function(){ ok(false); };
    strictEqual(model.save(), false);
  });

  test("#1377 - Save without attrs triggers 'error'.", 1, function() {
    var Model = AmpersandModel.extend({
      props: {
        id: 'number'
      },
      url: '/test/',
      sync: function(method, model, options){ options.success(); },
      validate: function(){ return 'invalid'; }
    });
    var model = new Model({id: 1});
    model.on('invalid', function(){ ok(true); });
    model.save();
  });

  asyncTest("#1478 - Model `save` does not trigger change on unchanged attributes", 0, function() {
    var Model = AmpersandModel.extend({
      props: {
        x: 'boolean'
      },
      sync: function(method, model, options) {
        setTimeout(function(){
          options.success();
          start();
        }, 0);
      }
    });
    new Model({x: true})
    .on('change:x', function(){ ok(false); })
    .save(null, {wait: true});
  });


});
