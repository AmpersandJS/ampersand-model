# StrictModel

Strict models are meant to be (nearly) a drop-in replacement for Backbone models but are far more restrictive and structured. Backbone models have a lot of flexibility in that you don't have to define what you're wanting to store ahead of time. 

The only challenge with that is that for more complex applications is actually becomes quite tricky to remember what properties are available to you.

Using strict models means they're much more self-documenting and helps catch bugs. Someone new to the project can read the models and have a pretty good idea of how the app is put together.

It also uses's ES5's fancy `Object.defineProperty` to treat model attributes as if they were properties.

This means you can set an attribute like this: `user.name = 'henrik'` and still get a `change:name` event fired. 

Obviously, this restriction also means that this won't work in browsers that don't support that. You can check specific browser support here: http://kangax.github.io/es5-compat-table/

This project still needs more love, but I figured I'd open it up for now anyway. Open source, FTW!

## Key Differences from BackBone

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
StrictModel.extend({
    // every strict model needs a type
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

### Setting model attributes

```js
// backbone:
user.set('firstName', 'billy bob');

// strict:
user.firstName = 'billy bob';

// p.s. you can still do it the other way in strict (so you can still pass otions)
user.set('firstName', 'billy bob', {silent: true})
```

### Getting model attributes

```js
// backbone:
user.get('firstName');

// strict
user.firstName;
```

## The Registry

Strict inits a global registery for storing all initted models. It's designed to be used for looking up models based on their type, id and optional namespace.

TODO: needs more docs on this


## Caveats 

- Because it's not based on Backbone's Model prototype adding initted models to a collection will not work as expected because Backbone checks to see if the incoming model is an `instancof Model` which it will never be since it's not inheriting from Backbone's models. So, it require some minor tweaking of Backbone's collection code.
- There are probably still plenty of bugs. Please use carefully.
- Needs better docs/more tests.


## Authors

Created by [@HenrikJoreteg](http://twitter.com/henrikjoreteg) with contributions from [@beausorensen](http://twitter.com/beausorensen)


## License

MIT
