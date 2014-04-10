# ampersand-model

ampersand-model helps you create observable models for your apps. Most commonly in clientside frameworks, your models are what hold data fetched from your API. But really, it's all about having a way to separate concerns. Your models should be your authoritive "source of truth" when it comes to all state held in your application.

ampersand-model takes what backbone models do a step further by forcing you to explicitly define what the model is going to store so that the model code can end up being self-documenting in that you can now simply look at the model code and see what they're expected to store.

This is hugely important for enabling teams to work on the same app together. There's also a few extra goodies, like direct accessors (not having to use `.set()` and `.get()`), and intelligently evented dervied properties.

<!-- starthide -->
Part of the [Ampersand.js toolkit](http://ampersandjs.com) for building clientside applications.
<!-- endhide -->

## Installing

via npm:

```
npm install ampersand-model
```

via bower: 

```
bower install ampersand-model
```

## Browser compatibility

[![testling badge](https://ci.testling.com/ampersandjs/ampersand-model.png)](https://ci.testling.com/ampersandjs/ampersand-model)


## Types of state

Take for instance a `selected` property on a model. That's likely something you would use to represent current UI state for the current browser session but not something you'd want to save back to the API when calling a model's .save() method. So there really are two types of state. It's challenging to make that type of distinction with Backbone.

ampersand-model supports three types of state that will get stored on a model: 

 - **properties**: State that comes from (and will be sent back to) our API and represents the data persisted on the server.
 - **session properties**: State that represents current browser session state. 
 - **derived properties**: These are read-only psuedo properties that are usually derived from properties or session properties. These are generally created for convenince or as a means to let you cache a computed result (read more below).

In ampersand model you have to classify all your properties as either `prop` or a `session`. That includes declaring your `id` property. How ampersand-model handles properties that you have not pre-defined is determined by its `extraProperties` setting. But, by default properties that are `.set()` on a model that you have not defined are simply ignored.


## Handling model relationships

From our experience, derived properties work really well for handling relationships between models. Let's say you've got a model representing people and model representing a group of people. Often your API for fetching people would include something like a groupID as a property for each person you retrieve.


## Why do this?

Backbone models have a lot of flexibility in that you don't have to define what you're wanting to store ahead of time. 

The only challenge with that is that for more complex applications is actually becomes quite difficult to remember what properties are available to you.

Using ampersand models means they're much more self-documenting and help catch bugs. Someone new to the project can read the models and have a pretty good idea of how the app is put together.

It also uses's ES5's fancy `Object.defineProperty` to treat model attributes as if they were properties.

That means with Ampersand Model you can set an attribute like this: `user.name = 'henrik'` and still get a `change:name` event fired. 

Obviously, this restriction also means that this won't work in browsers that don't support that. You can check specific browser support here: http://kangax.github.io/es5-compat-table/


## Explicit model definitions

Schema definitions take an attribute called `props` to defined properties.

Property names can be defined two different ways, either an array with `[type, required, default]`,
or an object: `{ type: 'string', required: true, default: '' , allowNull: false}`

types can be: `string`, `number`, `boolean`, `array`, `object`, or `date`
required: true, false (optional)
default: any (optional)
setOnce: true, false (optional)
test: function (optional)
allowNull: true, false (optional)
values: `['some', 'valid', 'values']`(optional) 

Note that when defining with an array `type`, `required`, and `default`
are the only property attributes you can set.

If `required` is true, the attribute will always have a value even if it is not explicitly set or is cleared.  If a default is given, that will be used.  If no default is given a default for its data type will be used (e.g. '' for string, {} for object)

If a `default` is given, the attribute will default to that value when the model is instantiated.

If `setOnce` is true, the attribute will throw an error if anything tries to set its value more than once.

If `values` is provided, you can only set that property to a value in the list. You can use this in combination with `type` to check both, or just use `values` and `default` by themselves. This is handy for `enum`-type stuff. For example:

```js
props: {
    alignment: {
        values: ['top', 'middle', 'bottom'],
        default: 'middle'
    }
}
```

If given, `test` should be a function that expects the new value (and optionally the new type) of the attribute.  It should return an error message on failure, and false on success

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

## A sample model with comments

```js
var Person = AmpersandModel.extend({
    // every ampersand model should have a type
    type: 'member',
    initialize: function () {
        // main initialization function
    },
    // props are for properties that exist on the server
    props: {
        id: {
            type: 'number',
            setOnce: true
        },
        firstName: ['string', true],
        lastName: ['string', true],
        created: ['date'],
        email: ['string', true],
        username: ['string', true],
        lastLogin: ['date'],
        largePicUrl: ['string'],
        department: {
            type: 'number',
            // you can optionally provide your own test function
            test: function (val) {
                if (val > 20) {
                    return "Invalid department";
                }
            }
        },
        alignment: {
            // you can also specify a list of valid values
            values: ['top', 'middle', 'bottom'],
            default: 'middle'
        }
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
        messages: Messages
    },
    otherMethods: function (cb) {
        // of course you can tack on whatever other methods you want
    }
});
```

## Going hardcore "strict" definition

[Strict mode](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions_and_function_scope/Strict_mode) in JS is pretty great and is fairly well supported in modern browsers.

If you want to be *really* hardcore about not letting you set properties that aren't defined, you can specify `seal: true` when defining your model.

```js
// enable strict mode
"use strict";

var MySuperStrictModel = AmpersandModel.extend({
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

## Setting model attributes

```js
// backbone:
user.set('firstName', 'billy bob');

// ampersand:
user.firstName = 'billy bob';

// p.s. you can still do it the other way in ampersand (so you can still pass options)
user.set('firstName', 'billy bob', {silent: true})
```

## Getting model attributes

```js
// backbone:
user.get('firstName');

// ampersand
user.firstName;
```

## Running the tests

```
npm test
```

*note*: Much of the functionality of ampersand-model is actually inherited from [ampersand-state](https://github.com/ampersandjs/ampersand-state) and is tested seperately there. In order to ensure compatibility with backbone to the extent possible we started with all the tests from Backbone and modified them to use ampersand-model. But over time they've been spread out and converted to be run with [tape](https://github.com/substack/tape) so we can automatically test against many browser versions with testling.


## Module: ampersand-model

The module exports just one item, the ampersand-model constructor. It's has a method called `extend` that works as follows:

### .extend(modelDefinition)

* Returns: {Constructor} A custom constructor for generating instances of the model you defined.
* `modelDefinition` {Object} An object containing your entire model definition
  * `props` {Object} An object of named property definitions
  * `session` {Object} An object of named session property definitions
  * `derived` {Object} An object of named derived property definitions
    * `derivedDefinition` {Object | Function} This can either be a single function or an object describing the derived property and its dependencies.
      * `deps` {Array} An array containing strings of other property names or derived property names. When these change, the derived property is re-calculated and only if different than previous cached value, a `change` event is fired for the derived property.
      * `fn` {Function} A function that returns the value of the derived property. This function's `this` will be the model instance.
      * `cache` {Boolean} Default: `true` Whether or not to cache the result.
  * `initialize` {Function} Default: `function () {}` An overridable function that will be called as a last step in the instantiation process for your model. It get called with as the constructor got. 


`extend` is the main method you'll use to create model definitions. It returns a custom constructor that can be used to create instances of your custom model.

As an example imagine two modules `app.js` and `UserModel.js`.

The contents of `UserModel.js` defines a model:

```js
var AmpersandModel = require('ampersand-model');

// define a model
var UserModel = AmpersandModel.extend({
    props: {
        name: 'string'
    }
});

var user = new User({name: 'henrik'});

console.log(user.name); // logs out 'henrik'
```

### .dataTypes

The dataTypes


<!-- starthide -->

## Authors

Created by [@HenrikJoreteg](http://twitter.com/henrikjoreteg) with contributions from:

- [@beausorensen](http://twitter.com/beausorensen)
- [@LanceStout](https://twitter.com/lancestout)
- [@philip_roberts](https://twitter.com/philip_roberts)
- [@svenlito](https://twitter.com/svenlito)


## Changelog

 - 2.6.0 - Cached, derived properties only fire change events now if new derived value is different from cache, instead of blindly firing change events if dependent properties changed.
 - 2.5.0 - UMD support by @swenlito
 - 2.4.0 - Added `toggle` method for boolean properties and properties with `values`
 - 2.3.0 - Added `values` to property definition
 - 2.2.0 - Added test parameter to property definitions
 - 2.1.0 - Added allowNull parameter to property definitions
 - 2.0.0 - Minor, but incompatible fix that remove `toServer` getter in lieu of adding `serialize` method that can be overridden.
 - 1.4.0 - Find/fix performance bottleneck. Significantly faster to instantiate larger numbers of models now.
 - 1.3.0 - Fix bug where session props were included in `.save()`
 - 1.2.0 - Make it possible to overwrite or extend data types.
 - 1.0.0 - Switching from `extend()` to `define()` pattern for building a model definition.

## License

MIT

<!-- endhide -->
