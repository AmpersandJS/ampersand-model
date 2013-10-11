# human-model

Human Models are meant to work as a drop-in replacement for Backbone models. In fact, it's extensively tested against the unit tests from Backbone (open test/index.html to run). 

However, Human Models are far more restrictive and structured. They force you to specify properties (at at minimum their types) for things you want it to store.

## Why do this?

Backbone models have a lot of flexibility in that you don't have to define what you're wanting to store ahead of time. 

The only challenge with that is that for more complex applications is actually becomes quite difficult to remember what properties are available to you.

Using human models means they're much more self-documenting and help catch bugs. Someone new to the project can read the models and have a pretty good idea of how the app is put together.

It also uses's ES5's fancy `Object.defineProperty` to treat model attributes as if they were properties.

That means with Human Model you can set an attribute like this: `user.name = 'henrik'` and still get a `change:name` event fired. 

Obviously, this restriction also means that this won't work in browsers that don't support that. You can check specific browser support here: http://kangax.github.io/es5-compat-table/


## Key Differences from Backbone

Everything Backbone does with Collections should Just Work™ with HumanModel as long as you specify a HumanModel constructor as a collection's `model` property.

**important**: One key point to understand is that unlike backbone. You're actually passing an object definition that describes the Model, not just methods to attach to its prototype. For example, you'll notice we call `HumanModel.define()` instead of `Backbone.Model.extend()`. This is to make the distinction clear.

Besides that and the obvious differences, any behavior that doesn't match Backbone should be considered a bug.


### Explicit model definitions

Schema definitions take an attribute called `props` to defined properties.

Property names can be defined two different ways, either an array with `[type, required, default]`,
or an object: `{ type: 'string', required: true, default: '' }`

types can be: `string`, `number`, `boolean`, `array`, `object`, or `date`
required: true, false (optional)
default: any (optional)

```js
props: {
    firstName: ['string', true, 'Jim']
    lastName: {
        type: 'string', 
        required: false, 
        default: 'Bob' 
    }
}
```

### A sample model with comments

```js
var Person = HumanModel.define({
    // every human model should have a type
    type: 'member',
    init: function () {
        // main initialization function
    },
    // props are for properties that exist on the server
    props: {
        id: ['string', true],
        firstName: ['string', true],
        lastName: ['string', true],
        created: ['date'],
        email: ['string', true],
        username: ['string', true],
        lastLogin: ['date'],
        largePicUrl: ['string']
    },
    // derived properties and their dependencies. If any dependency changes
    // that will also trigger a 'change' event on the derived property so
    // we know to re-render the template
    derived: {
        // fullName is 
        fullName: {
            // you can optionally define the properties this derived property
            // depends on. That way if the underlying properties change you can
            // listen for changes directly on the derived property.
            deps: ['firstName', 'lastName'],
            fn: function () {
                return this.firstName + ' ' + this.lastName;
            }
        }
    },
    // Session properties are browser state for a model
    // these trigger 'change' events when set, but are not
    // included when serializing or saving to server.
    session: {
        selectedTasks: ['array', true, []],
        lastPage: ['string', true, 'tasks'],
        unread: ['boolean', true, false],
        active: ['boolean', true, false]
    },
    // child collections that will be initted. They will
    // be created at as a property of the same name as the
    // key. The child collection will also be given a reference
    // to its parent.
    collections: {
        // messages: Messages
    },
    otherMethods: function (cb) {
        // of course you can tack on whatever other methods you want
    }
});
```

### Going hardcore "strict" definition

[Strict mode](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions_and_function_scope/Strict_mode) in JS is pretty great and is fairly well supported in modern browsers.

If you want to be *really* hardcore about not letting you set properties that aren't defined, you can specify `seal: true` when defining your model.

```js
// enable strict mode
"use strict";

var MySuperStrictModel = HumanModel.define({
    // set this to true
    seal: true,
    // also throw errors for properties not defined
    // when set via `set`.
    extraProperties: 'reject',
    // normal properties
    props: {
        name: 'string'
    }
});

// create an instance of this model
var model = new MySuperStrictModel();

// setting defined properties works like usual
model.name = 'something';

// BUT, setting a property that doesn't exist
// will throw an error because the object is sealed.
model.something = 'something else'; // KABOOM!

```

### Setting model attributes

```js
// backbone:
user.set('firstName', 'billy bob');

// human:
user.firstName = 'billy bob';

// p.s. you can still do it the other way in human (so you can still pass otions)
user.set('firstName', 'billy bob', {silent: true})
```

### Getting model attributes

```js
// backbone:
user.get('firstName');

// human
user.firstName;
```

## The Registry

HumanModel also inits a global registery for storing all initted models. It's designed to be used for looking up models based on their type, id and optional namespace.

It's purpose is finding/updating models when we get updates pushed to us from the server. This is very important for buildling realtime apps.

TODO: needs more docs on the registry.

## Tests

An extensive suite of tests can be run by opening `test/index.html` in a browser. In order to ensure compatibility with backbone to the extent possible I started with all the tests from Backbone 1.0.0 and modified them to use HumanModel.

## Caveats 

- Since backbone does an `instanceof` check when adding initted models to a collection, HumanModel monkey patches the `_prepareModel` collection method to check against HumanModel instead.
- Still needs better docs. Probably a full docs site.

## Authors

Created by [@HenrikJoreteg](http://twitter.com/henrikjoreteg) with contributions from:

- [@beausorensen](http://twitter.com/beausorensen)
- [@LanceStout](https://twitter.com/lancestout)
- [@philip_roberts](https://twitter.com/philip_roberts)


## Changelog

 - 1.4.0 - Find/fix performance bottleneck. Significantly faster to instantiate larger numbers of models now.
 - 1.3.0 - Fix bug where session props were included in `.save()`
 - 1.2.0 - Make it possible to overwrite or extend data types.
 - 1.0.0 - Switching from `extend()` to `define()` pattern for building a model definition.

## License

MIT
