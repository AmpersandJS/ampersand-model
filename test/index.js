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
    t.plan(1);
    var Foo = getModel();
    var foo = new Foo({thing: 'meow'});
    foo.on('change', function () {
        t.fail();
    });
    foo.remove();
    foo.thing = 'cow';
    setTimeout(function () {
        t.pass();
        t.end();
    }, 0);
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
