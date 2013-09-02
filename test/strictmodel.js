$(function() {
  var definition, Foo, Collection, collection;

  module("StrictModel", _.extend(new Environment, {
    setup: function() {
      Environment.prototype.setup.apply(this, arguments);

      definition = {
        type: 'foo',
        props: {
          id: 'number',
          firstName: ['string', true, 'defaults'],
          lastName: ['string', true],
          thing: {
            type: 'string',
            required: true,
            default: 'hi'
          },
          num: ['number', true],
          today: ['date'],
          hash: ['object'],
          list: ['array'],
          myBool: ['boolean', true, false]
        },
        derived: {
          name: {
            deps: ['firstName', 'lastName'],
            fn: function () {
              return this.firstName + ' ' + this.lastName;
            }
          },
          initials: {
            deps: ['firstName', 'lastName'],
            fn: function () {
              // This currently breaks without both deps being set
              if (this.firstName && this.lastName) {
                return (this.firstName.charAt(0) + this.lastName.charAt(0)).toUpperCase();
              }
              return '';
            }
          },
          isCrazy: {
            deps: ['crazyPerson'],
            fn: function () {
              return !!this.crazyPerson;
            }
          }
        }
      };

      Foo = Strict.Model.extend(definition);
      Collection = Backbone.Collection.extend({
        url : function() { return '/collection'; }
      });
    }
  }));

  test('should get the derived value', function () {
    var foo = new Foo({
      firstName: 'jim',
      lastName: 'tom'
    });
    strictEqual(foo.name, 'jim tom');
    strictEqual(foo.initials, 'JT');
  });

  test('should be sealable', 2, function () {
    definition.seal = true;
    var Bar = Strict.Model.extend(definition);
    var bar = new Bar();
    throws(function () {
      "use strict";
      bar.someProperty = 'new';
    }, TypeError, 'Throws exception in strict mode.');
    bar.someOtherProperty = 'something';
    ok(!bar.someOtherProperty, 'ignores properties otherwise');
  });

  test('should have default values for properties', 1, function () {
    var foo = new Foo({
      firstName: 'jim',
      lastName: 'tom'
    });
    strictEqual(foo.myBool, false);
  });

  test('should throw an error setting a derived prop', function () {
    var foo = new Foo();
    try { foo.name = 'bob'; }
    catch (err) { ok(err instanceof TypeError); }
  });

  test('should get correct defaults', function () {
    var foo = new Foo({});
    strictEqual(foo.firstName, 'defaults');
    strictEqual(foo.thing, 'hi');
  });

  test('Setting other properties without explicit permission throws error', 1, function () {
    var foo = new Foo();
    throws(function () {
      foo.set({
        craziness: 'new'
      });
    }, Error, 'Throws exception unless allowed');
  });

  test('Setting other properties is ok if allowOtherProperties is true', 1, function () {
    var foo = new Foo();
    foo.allowOtherProperties = true;
    foo.set({
      craziness: 'new'
    });
    window.foo = foo;
    //debugger;
    equal(foo.get('craziness'), 'new');
  });

  test('should throw a type error for bad data types', function () {
    try { new Foo({firstName: 3}); }
    catch (err) { ok(err instanceof TypeError); }

    try { new Foo({num: 'foo'}); }
    catch (err) { ok(err instanceof TypeError); }

    try { new Foo({hash: 10}); }
    catch (err) { ok(err instanceof TypeError); }

    try { new Foo({today: 10}); }
    catch (err) { ok(err instanceof TypeError); }

    try { new Foo({list: 10}); }
    catch (err) { ok(err instanceof TypeError); }
  });

  test('should validate model', 2, function () {
    var foo = new Foo();
    equal(foo._verifyRequired(), false);

    foo.firstName = 'a';
    foo.lastName = 'b';
    foo.thing = 'abc';
    foo.num = 12;
    ok(foo._verifyRequired());
  });

  test('should store previous attributes', function () {
    var foo = new Foo({
      firstName: 'beau'
    });
    foo.firstName = 'john';
    strictEqual(foo.firstName, 'john');
    strictEqual(foo.previous('firstName'), 'beau');
    foo.firstName = 'blah';
    strictEqual(foo.previous('firstName'), 'john');
  });

  test('should have list method helpers', function () {
    var foo = new Foo({
      hash: [1, 2, 'a', 'b']
    });
    ok(foo.hasListVal('hash', 2));

    foo.removeListVal('hash', 1);
    deepEqual([2, 'a', 'b'], foo.hash);

    foo.addListVal('hash', 10);
    deepEqual([2, 'a', 'b', 10], foo.hash);
  });

  test('should have data serialization methods', function () {
    var foo = new Foo({
      firstName: 'bob',
      lastName: 'tom',
      thing: 'abc'
    });

    strictEqual(foo.json, '{"firstName":"bob","lastName":"tom","thing":"abc","myBool":false}');
    deepEqual(foo.keys(), [
      'firstName',
      'lastName',
      'thing',
      'myBool'
    ]);
    deepEqual(foo.attributes, {
      firstName: 'bob',
      lastName: 'tom',
      thing: 'abc',
      myBool: false
    });
    deepEqual(foo.toTemplate, {
      firstName: 'bob',
      lastName: 'tom',
      thing: 'abc',
      name: 'bob tom',
      isCrazy: false,
      initials: 'BT',
      myBool: false
    });
  });

  test('should fire events normally for properties defined on the fly', 1, function (next) {
    var foo = new Foo();
    foo.allowOtherProperties = true;
    foo.on('change:crazyPerson', function () {
      ok(true);
    });
    foo.set({
      crazyPerson: true
    });
  });

  test('should fire event on derived properties, even if dependent on ad hoc prop.', 1, function () {
    var Foo = new Strict.Model.extend({
      allowOtherProperties: true,
      derived: {
        isCrazy: {
          deps: ['crazyPerson'],
          fn: function () {
            return !!this.crazyPerson;
          }
        }
      }
    });
    foo.allowOtherProperties = true;
    foo.on('change:isCrazy', function () {
      ok(true);
    });
    foo.set({
      crazyPerson: true
    });
  });

  test('should fire general change event on single attribute', 1, function (next) {
    var foo = new Foo({firstName: 'coffee'});
    foo.on('change', function () {
      ok(true);
    });
    foo.firstName = 'bob';
  });

  test('should fire single change event for multiple attribute set', 1, function (next) {
    var foo = new Foo({firstName: 'coffee'});
    foo.on('change', function () {
      ok(true);
    });
    foo.set({
      firstName: 'roger',
      lastName: 'smells'
    });
  });

  test('derived properties', function () {
    var ran = 0;
    var notCachedRan = 0;
    var Foo = Strict.Model.extend({
      props: {
        name: ['string', true]
      },
      derived: {
        greeting: {
          cache: true,
          deps: ['name'],
          fn: function () {
            ran++;
            return 'hi, ' + this.name;
          }
        },
        notCached: {
          deps: ['name'],
          fn: function () {
            notCachedRan++
            return 'hi, ' + this.name;
          }
        }
      }
    });
    var foo = new Foo({name: 'henrik'});
    strictEqual(ran, 0, 'derived function should not have run yet.');
    equal(foo.greeting, 'hi, henrik');
    equal(foo.greeting, 'hi, henrik');
    equal(ran, 1, 'cached derived should only run once');
    equal(notCachedRan, 0, 'shold not have been run yet')
    foo.name = 'someone';
    equal(foo.greeting, 'hi, someone');
    equal(foo.greeting, 'hi, someone');
    equal(ran, 2, 'cached derived should have been cleared and run once again');
    equal(notCachedRan, 1, 'shold have been run once because it was triggered');
    equal(foo.notCached, 'hi, someone');
    equal(notCachedRan, 2, 'incremented again');
    equal(foo.notCached, 'hi, someone');
    equal(notCachedRan, 3, 'incremented each time');
  });

  test('derived properties with derived dependencies', 5, function () {
    var ran = 0;
    var Foo = Strict.Model.extend({
      props: {
        name: ['string', true]
      },
      derived: {
        greeting: {
          deps: ['name'],
          fn: function () {
            return 'hi, ' + this.name;
          }
        },
        awesomeGreeting: {
          deps: ['greeting'],
          fn: function () {
            return this.greeting + '!';
          }
        }
      }
    });
    var foo = new Foo({name: 'henrik'});
    foo.on('change:awesomeGreeting', function () {
      ran++;
      ok(true, 'should fire derived event');
    });
    foo.on('change:greeting', function () {
      ran++;
      ok(true, 'should fire derived event');
    });
    foo.on('change:name', function () {
      ran++;
      ok(true, 'should fire derived event');
    });
    foo.on('change', function () {
      ran++;
      ok(true, 'should file main event')
    });
    foo.name = 'something';
    equal(ran, 4);
  });

  test('should fire a remove event', 1, function (next) {
    var foo = new Foo({firstName: 'hi'});
    foo.on('remove', function () {
      ok(true);
    });
    foo.remove();
  });

  test('should remove all event bindings after remove', 1, function (next) {
    var foo = new Foo({thing: 'meow'});
    foo.on('change', function () {
      ok(false);
    });
    foo.remove();
    foo.thing = 'cow';
    ok(true);
  });

  test('should store models in the registry', 3, function () {
    var foo = new Foo({
      id: 1,
      firstName: 'roger',
      thing: 'meow'
    });
    var blah = Strict.registry.lookup('foo', 1);
    strictEqual(foo.firstName, blah.firstName);
    strictEqual(foo, blah);
    foo.on('change', function () {
      ok(true);
    });
    blah.firstName = 'blah';
  });

  test('should remove from registry on remove', 2, function () {
    var foo = new Foo({id: 20, lastName: 'hi'});
    foo.remove();
    var found = Strict.registry.lookup('foo', 20);
    ok(!found);
    // make a new one
    var bar = new Foo({id: 20});
    strictEqual(bar.lastName, '');
  });

});
