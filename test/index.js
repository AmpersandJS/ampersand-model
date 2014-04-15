var test = require('tape');
var Model = require('../ampersand-model');
var AmpersandRegistry = require('ampersand-registry');


function getModel() {
    var registry = new AmpersandRegistry();

    return Model.extend({
        modelType: 'foo',
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
            myBool: ['boolean', true, false],
            someNumber: {type: 'number', allowNull: true},
            good: {
                type: 'string',
                test: function (newVal) {
                    if (newVal !== 'good') {
                        return "Value not good";
                    }
                }
            }
        },
        session: {
            active: ['boolean', true, true]
        },
        // add a reference to the registry
        registry: registry
    });
}

test('should have list method helpers', function (t) {
    var Foo = getModel();
    var foo = new Foo({
        hash: [1, 2, 'a', 'b']
    });
    t.ok(foo.hasListVal('hash', 2));

    foo.removeListVal('hash', 1);
    t.deepEqual([2, 'a', 'b'], foo.hash);

    foo.addListVal('hash', 10);
    t.deepEqual([2, 'a', 'b', 10], foo.hash);
    t.end();
});

test('should fire a remove event', function (t) {
    var Foo = getModel();
    var foo = new Foo({firstName: 'hi'});
    foo.on('remove', function () {
        t.pass('remove event fired');
        t.end();
    });
    foo.remove();
});

test('should remove all event bindings after remove', function (t) {
    var Foo = getModel();
    var foo = new Foo({thing: 'meow'});
    foo.on('change', function () {
        t.fail();
    });
    foo.remove();
    foo.thing = 'cow';
    t.end();
});

test('should remove from registry on remove', function (t) {
    var Foo = getModel();
    var foo = new Foo({id: 20, lastName: 'hi'});
    foo.remove();
    var found = foo.registry.lookup('foo', 20);
    t.ok(!found);
    // make a new one
    var bar = new Foo({id: 20});
    t.strictEqual(bar.lastName, '');
    t.end();
});

test('custom id and namespace attributes', function (t) {
    var NewPerson = Model.extend({
        props: {
            name: 'string',
            _id: 'number',
            ns: 'string'
        },
        idAttribute: '_id',
        namespaceAttribute: 'ns'
    });
    var person = new NewPerson({name: 'henrik', ns: 'group1', _id: 47});
    t.equal(person.getId(), 47);
    t.equal(person.getNamespace(), 'group1');
    t.end();
});

test('customizable `type` attribute', function (t) {
    var FirstModel = Model.extend({
        type: 'hello',
        typeAttribute: 'type'
    });
    var SecondModel = Model.extend({
        modelType: 'second'
    });
    var first = new FirstModel();
    var second = new SecondModel();
    t.equal(first.getType(), 'hello');
    t.equal(second.getType(), 'second');
    t.end();
});

test('should store models in the registry', function (t) {
    var Foo = getModel();
    var foo = new Foo({
        id: 1,
        firstName: 'roger',
        thing: 'meow'
    });
    var blah = foo.registry.lookup('foo', 1);
    t.strictEqual(foo.firstName, blah.firstName);
    t.strictEqual(foo, blah);
    foo.on('change', function () {
        t.ok(true);
    });
    blah.firstName = 'blah';
    t.end();
});
