var test = require('tape');
var Model = require('../ampersand-model');


function getModel() {
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
        }
    });
}

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

test('constructor should be defined', function (t) {
    var Foo = Model.extend({
        props: { name: 'string' }
    });
    var foo = new Foo();

    t.ok(foo.constructor);
    t.end();
});

test('isValid is a thing', function (t) {
    var Foo = Model.extend({
        props: { name: ['string', true] },
        validate: function (attrs) {
            if (attrs.name.length < 2) {
                return "can't be too short";
            }
        }
    });

    var foo = new Foo();
    t.notOk(foo.isValid());
    foo.name = 'thing';
    t.ok(foo.isValid());
    t.end();
});
