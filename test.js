'use strict';

var Strict = require('./index'),
assert = require('assert');

var Foo = Strict.Model.extend({
  type: 'foo',
  props: {
    firstName: ['string', true, 'defaults'],
    lastName: ['string', true],
    thing: {
      type: 'string',
      required: true,
      default: 'hi'
    },
    num: ['number'],
    today: ['date'],
    hash: ['object'],
    list: ['array']
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
    }
  }
});

describe('Strict.Model', function () {

  it('should get the derived value', function () {
    var foo = new Foo({
      firstName: 'jim',
      lastName: 'tom'
    });
    assert.strictEqual(foo.name, 'jim tom');
    assert.strictEqual(foo.initials, 'JT');
  });

  it('should throw an error setting a derived prop', function () {
    var foo = new Foo();
    try { foo.name = 'bob'; }
    catch (err) { assert.ok(err instanceof TypeError); }
  });

  it('should get correct defaults', function () {
    var foo = new Foo({});
    assert.strictEqual(foo.firstName, 'defaults');
    assert.strictEqual(foo.thing, 'hi');
  });

  it('should throw a type error for bad data types', function () {
    try { new Foo({firstName: 3}); }
    catch (err) { assert.ok(err instanceof TypeError); }

    try { new Foo({num: 'foo'}); }
    catch (err) { assert.ok(err instanceof TypeError); }

    try { new Foo({hash: 10}); }
    catch (err) { assert.ok(err instanceof TypeError); }

    try { new Foo({today: 10}); }
    catch (err) { assert.ok(err instanceof TypeError); }

    try { new Foo({list: 10}); }
    catch (err) { assert.ok(err instanceof TypeError); }
  });

  it('should validate model', function () {
    var foo = new Foo();
    assert.equal(foo._verifyRequired(), false);

    foo.firstName = 'a';
    foo.lastName = 'b';
    foo.thing = 'abc';
    assert.ok(foo._verifyRequired());
  });

  it('should store previous attributes', function () {
    var foo = new Foo({
      firstName: 'beau'
    });
    foo.firstName = 'john';
    assert.strictEqual(foo.firstName, 'john');
    assert.strictEqual(foo.previous('firstName'), 'beau');
    foo.firstName = 'blah';
    assert.strictEqual(foo.previous('firstName'), 'john');
  });

  it('should have list method helpers', function () {
    var foo = new Foo({
      hash: [1, 2, 'a', 'b']
    });
    assert.ok(foo.hasListVal('hash', 2));

    foo.removeListVal('hash', 1);
    assert.deepEqual([2, 'a', 'b'], foo.hash);

    foo.addListVal('hash', 10);
    assert.deepEqual([2, 'a', 'b', 10], foo.hash);
  });

  it('should have data serialization methods', function () {
    var foo = new Foo({
      firstName: 'bob',
      lastName: 'tom',
      thing: 'abc'
    });

    assert.strictEqual(foo.json, '{"firstName":"bob","lastName":"tom","thing":"abc"}');
    assert.deepEqual(foo.keys, [
      'firstName',
      'lastName',
      'thing',
      'num',
      'today',
      'hash',
      'list',
      'id'
    ]);
    assert.deepEqual(foo.attributes, {
      firstName: 'bob',
      lastName: 'tom',
      thing: 'abc',
      num: undefined,
      today: undefined,
      hash: undefined,
      list: undefined,
      id: undefined
    });
    assert.deepEqual(foo.toTemplate, {
      firstName: 'bob',
      lastName: 'tom',
      thing: 'abc',
      num: undefined,
      today: undefined,
      hash: undefined,
      list: undefined,
      id: undefined,
      name: 'bob tom',
      initials: 'BT'
    });
  });
});

describe('Strict.Registry', function () {
  it('should store models in the registry', function (next) {
    var foo = new Foo({
      id: 1,
      firstName: 'roger',
      thing: 'meow'
    });
    var blah = new Foo({
      id: 1
    });
    assert.strictEqual(foo.firstName, blah.firstName);
    assert.strictEqual(foo, blah);
    foo.on('change', function () {
      next();
    });
    blah.firstName = 'blah';
  });

  it('should remove from registry on remove', function () {
    var foo = new Foo({id: 20, lastName: 'hi'});
    var blah = new Foo({id: 20});

    assert.strictEqual(foo.lastName, blah.lastName);
    foo.remove();

    var bar = new Foo({id: 20});
    assert.strictEqual(bar.lastName, undefined);
  });
});

describe('Strict.Events', function () {
  it('should fire change event for specific attribute', function (next) {
    var foo = new Foo({firstName: 'coffee'});
    foo.on('change:firstName', function () {
      next();
    });
    foo.firstName = 'bob';
  });

  it('should fire general change event on single attribute', function (next) {
    var foo = new Foo({firstName: 'coffee'});
    foo.on('change', function () {
      next();
    });
    foo.firstName = 'bob';
  });

  it('should fire single change event for multiple attribute set', function (next) {
    var foo = new Foo({firstName: 'coffee'});
    foo.on('change', function () {
      next();
    });
    foo.set({
      firstName: 'roger',
      lastName: 'smells'
    });
  });

  it('should fire a remove event', function (next) {
    var foo = new Foo({firstName: 'hi'});
    foo.on('remove', function () {
      next();
    });
    foo.remove();
  });

  it('should remove all event bindings after remove', function (next) {
    var foo = new Foo({thing: 'meow'});
    foo.on('change', function () {
      next();
    });
    foo.remove();
    foo.thing = 'cow';
    next();
  });
});
