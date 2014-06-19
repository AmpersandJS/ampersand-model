# ampersand-model

<!-- starthide -->
Part of the [Ampersand.js toolkit](http://ampersandjs.com) for building clientside applications.
<!-- endhide -->

ampersand-model helps you create observable models for your apps. Most commonly in clientside frameworks, your models are what hold data fetched from your API. But really, it's all about having a way to separate concerns. Your models should be your authoritive "source of truth" when it comes to all state held in your application.

ampersand-model intentionally force you to explicitly define what the model is going to store.

This ensures that the model code, which is so central to the app, ends up serving as a bit of documentation for the app. A new dev can go look at what's being stored in what types of models.

This is hugely important for enabling teams to work on the same app together. 

Ampersand-model gets most of it's features from [ampersand-state](http://ampersandjs.com/docs/#ampersand-state) but also adds in the tools you'll need for working with a server API. 


## Installing

```
npm install ampersand-model
```

## Usage


This module exports just one thing. The constructor for an Ampersand Model with an `extend` method that you'll use to define your model.

Typically you create a file for each type of model in your app:

File: `client/models/person.js`

```js
var AmpersandModel = require('ampersand-model');


// In your model you'll export a version of AmpersandModel
// extended with your properties and methods.
module.exports = AmpersandModel.extend({
    props: {
        name: 'string',
        age: 'number'
    }
});

```

Then using it would look like this:

File: `client/some-other-file.js`

```js
// we require our person model we defined in the module above
var PersonModel = require('./models/person');


// We can now create instances of the model 
// using `new` and setting attributes.
var mary = new PersonModel({name: 'mary'});
```

## Getting and setting properties

With ampersand models you don't have to use `set` and `get` (though, you still can). You can simply set and assign values to properties and change events will still fire so the object can be observed.

It does this using [`Object.defineProperty`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty) under the hood.


```js
var person = new Person({name: 'mary'});

// all of these are identical
person.name = 'sue';
person.set(name, 'sue');
person.set({name: 'sue'});

// but there are times when it's useful to use `set`
// like not firing events
person.set({name: 'sue'}, {silent: true});

// or setting multiple things at once
person.set({name: 'bob', age: 30});

```

## Observing

Ampersand gets its event system from Backbone using the [backbone-events-standalone](https://www.npmjs.org/package/backbone-events-standalone) module on npm.

For more, [read all about how events work in ampersand](http://ampersandjs.com/learn/events).

## Browser compatibility

[![testling badge](https://ci.testling.com/ampersandjs/ampersand-model.png)](https://ci.testling.com/ampersandjs/ampersand-model)

## API Reference

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

### idAttribute `model.idAttribute`

The attribute that should be used as the unique id of the model - typically the name of the property representing the model's id on the server. `getId` uses this to determine the id for use when constructing a model's url for saving to the server.

Defaults to `'id'`.

```
var Person = AmpersandModel.extend({
    idAttribute: 'personId',
    urlRoot: '/people',
    props: {
        personId: 'number',
        name: 'string'
    }
});

var me = new Person({ personId: 123 });

console.log(me.url()) //=> "/people/123"
```


### namespaceAttribute

### typeAttribute

### getId `model.getId()`

Get ID of model per `idAttribute` configuration. Should *always* be how ID is determined by other code.

### getNamespace `model.getNamespace()`

Get namespace of model per `namespaceAttribute` configuration. Should *always* be how namespace is determined by other code.

### getType `model.getType()`

Get type of model per `typeAttribute` configuration. Should *always* be how type is determined by other code.

### constructor/initialize

### collection

### registry

### cid `model.cid`
A special property of models, the **cid**, or a client id, is a unique identifier automatically assigned to all models when they are first created. Client ids are handy when the model has not been saved to the server, and so does not yet have it's true **id** but needs a unique id so it can be rendered in the UI etc.

```javascript
var userA = new User();
console.log(userA.cid) //=> "model-1"

var userB = new User();
console.log(userB.cid) //=> "model-2"
```

### save `model.save([attributes], [options])`

Save a model to your database (or alternative persistence layer), by delegating to Backbone.sync. Returns a xhr object if validation is successful and false otherwise. The attributes hash (as in set) should contain the attributes you'd like to change — keys that aren't mentioned won't be altered — but, a _complete representation_ of the resource will be sent to the server. As with `set`, you may pass individual keys and values instead of a hash. If the model has a validate method, and validation fails, the model will not be saved. If the model `isNew`, the save will be a "create" (HTTP POST), if the model already exists on the server, the save will be an "update" (HTTP PUT).

If instead, you'd only like the changed attributes to be sent to the server, call `model.save(attrs, {patch: true})`. You'll get an HTTP PATCH request to the server with just the passed-in attributes.

Calling save with new attributes will cause a `"change"` event immediately, a `"request"` event as the Ajax request begins to go to the server, and a `"sync"` event after the server has acknowledged the successful change. Pass `{wait: true}` if you'd like to wait for the server before setting the new attributes on the model.

```javascript
var book = new Backbone.Model({
  title: "The Rough Riders",
  author: "Theodore Roosevelt"
});

book.save();
//=> triggers a `POST` via ampersand-sync with { "title": "The Rough Riders", "author": "Theodore Roosevelt" }

book.save({author: "Teddy"});
//=> triggers a `PUT` via ampersand-sync with { "title": "The Rough Riders", "author": "Teddy" }
```

**save** accepts `success` and `error` callbacks in the options hash, which will be passed the arguments `(model, response, options)`. If a server-side validation fails, return a non-`200` HTTP response code, along with an error response in text or JSON.

### fetch `model.fetch([options])`

Resets the model's state from the server by delegating to ampersand-sync. Returns a xhr. Useful if the model has yet to be populated with data, or you want to ensure you have the latest server state. A `"change"` event will be triggered if the retrieved state from the server differs from the current attributes. Accepts `success` and `error` callbacks in the options hash, which are both passed `(model, response, options)` as arguments.

```javascript
var me = new Person({id: 123});
me.fetch();
```

### destroy `model.destroy([options])`

Destroys the model on the server by delegating an HTTP `DELETE` request to ampersand-sync. Returns the xhr object, or `false` if the model [isNew](#ampersand-model-isnew). Accepts `success` and `error` callbacks in the options hash, which are both passed `(model, response, options)` as arguments.

Triggers:

* a `"destroy"` event on the model, which will bubble up through any collections which contain it.
* a `"request"` event as it begins the Ajax request to the server
* a `"sync"` event, after the server has successfully acknowledged the model's deletion.

Pass `{wait: true}` if you'd like to wait for the server to respond before removing the model from the collection.

```javascript
var task = new Task({ id: 123 });
task.destroy({
    success: function () { alert('Task destroyed!'); },
    error: function () { alert('There was an error destroying the task'); },
});
```

### sync `model.sync(method, model, [options])`

Uses ampersand-sync to persist the state of a model to the server. Can be overrideen for custom behaviour.

### remove

### isNew `model.isNew()`

Has this model been saved to the server yet? If the model does not yet have an id, it is considered to be new.

### url `model.url()`

### urlRoot `model.urlRoot or model.urlRoot()`

### escape

Similar to `get`, but returns the HTML-escaped version of a model's attribute. If you're interpolating data from the model into HTML, using **escape** to retrieve attributes will help prevent XSS attacks.

```
var hacker = new Backbone.Model({
  name: "<script>alert('xss')</script>"
});

alert(hacker.escape('name'));
```

### addListVal

### removeListval

### hasListVal


### isValid `model.isValid()`

Check if the model is currently in a valid state, as per the `props`/`session` definitions.

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
