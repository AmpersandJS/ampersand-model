# ampersand-model

<!-- starthide -->
Part of the [Ampersand.js toolkit](http://ampersandjs.com) for building clientside applications.
<!-- endhide -->

ampersand-model is an extension built on [ampersand-state](http://ampersandjs.com/docs/#ampersand-state) to provide methods and properties that you'll often want when modeling data you get from an API.

For further explanation see the [learn ampersand-state](http://ampersandjs.com/learn/state) guide.

## Installing

```
npm install ampersand-model
```

## Observing

Ampersand gets its event system from Backbone using the [backbone-events-standalone](https://www.npmjs.org/package/backbone-events-standalone) module on npm.

For more, [read all about how events work in ampersand](http://ampersandjs.com/learn/events).

## Browser compatibility

[![testling badge](https://ci.testling.com/ampersandjs/ampersand-model.png)](https://ci.testling.com/ampersandjs/ampersand-model)

## API Reference

The module exports just one item, the ampersand-model constructor. It has a method called `extend` that works as follows:

### extend `AmpersandModel.extend({ })`

To create a **Model** class of your own, you extend **AmpersandModel** and provide instance properties and options for your class. Typically here you will pass any properties (`props`, `session`, and `derived`) of your model class, and any instance methods to be attached to instances of your class.

**extend** correctly sets up the prototype chain, so that subclasses created with **extend** can be further extended as many times as you like.

As with AmpersandState, definitions like `props`, `session`, `derived` etc will be merged with superclass definitions.

```javascript
var Person = AmpersandModel.extend({
    props: {
        firstName: 'string',
        lastName: 'string'
    },
    session: {
        signedIn: ['boolean', true, false],
    },
    derived: {
        fullName: {
            deps: ['firstName', 'lastName'],
            fn: function () {
                return this.firstName + ' ' + this.lastName;
            }
        }
    }
});
```


### constructor/initialize `new ExtendedAmpersandModel([attrs], [options])`

This works exactly like [state](http://ampersandjs.com/docs/#ampersand-state-constructorinitialize) with a minor addition: If you pass `collection` as part of options it'll be stored for reference.

As with AmpersandState, if you have defined an **initialize** function for your subclass of State, it will be invoked at creation time.

```javascript
var me = new Person({
    firstName: 'Phil',
    lastName: 'Roberts'
});

me.firstName //=> Phil
```

Available options:

* `[parse]` {Boolean} - whether to call the class's [parse](#ampersand-state-parse) function with the initial attributes. _Defaults to `false`_.
* `[parent]` {AmpersandState} - pass a reference to a model's parent to store on the model.
* `[collection]` {Collection} - pass a reference to the collection the model is in. Defaults to `undefined`.


### save `model.save([attributes], [options])`

Save a model to your database (or alternative persistence layer) by delegating to [ampersand-sync](https://github.com/ampersandjs/ampersand-sync). Returns a [xhr](https://github.com/Raynos/xhr) object if validation is successful and false otherwise. The attributes hash (as in [set](http://ampersandjs.com/docs#ampersand-state-set)) should contain the attributes you'd like to change — keys that aren't mentioned won't be altered — but, a *complete representation* of the resource will be sent to the server. As with `set`, you may pass individual keys and values instead of a hash. If the model has a validate method, and validation fails, the model will not be saved. If the model `isNew`, the save will be a "create" (HTTP POST).  If the model already exists on the server, the save will be an "update" (HTTP PUT).

If you only want the changed attributes to be sent to the server, call `model.save(attrs, {patch: true})`. You'll get an HTTP PATCH request to the server with just the passed-in attributes.

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

Resets the model's state from the server by delegating a GET to ampersand-sync. Returns a xhr. Useful if the model has yet to be populated with data, or you want to ensure you have the latest server state. A `"change"` event will be triggered if the retrieved state from the server differs from the current attributes. Accepts `success` and `error` callbacks in the options hash, which are both passed `(model, response, options)` as arguments.

```javascript
var me = new Person({id: 123});
me.fetch();
```

### destroy `model.destroy([options])`

Destroys the model on the server by delegating a HTTP `DELETE` request to ampersand-sync. Returns the xhr object, or `false` if the model [isNew](#ampersand-state-isnew). Accepts `success` and `error` callbacks in the options hash, which are both passed `(model, response, options)` as arguments.

Triggers:

* a `"destroy"` event on the model, which will bubble up through any collections which contain it.
* a `"request"` event as it begins the Ajax request to the server
* a `"sync"` event, after the server has successfully acknowledged the model's deletion.

Pass `{wait: true}` if you'd like to wait for the server to respond before removing the model from the collection.

```javascript
var task = new Task({id: 123});
task.destroy({
    success: function () {
        alert('Task destroyed!');
    },
    error: function () {
        alert('There was an error destroying the task');
    },
});
```

### sync `model.sync(method, model, [options])`

Uses ampersand-sync to persist the state of a model to the server. Usually you won't call this directly, you'd use `save` or `destroy` instead, but it can be overriden for custom behaviour.


## Configuring

### ajaxConfig `model.ajaxConfig or model.ajaxConfig()`

ampersand-sync will call ajaxConfig on your model before it makes the request to the server, and will merge in any options you return to the request. When extending your own model, set an ajaxConfig function to modify the request before it goes to the server.

ajaxConfig can either be an object, or a function that returns an object, with the following options:

* `useXDR` [boolean]: (applies to IE9 only with cross domain requests): signifies that this is a cross-domain request and that IE should use its XDomainRequest object. This is required if you're making cross-domain requests and want to support IE9). Note that XDR doesn't support headers/withCredentials.
* `headers` [object]: any extra headers to send with the request.
* `xhrFields` [object]: any fields to set directly on the [XHR](https://developer.mozilla.org/en/docs/Web/API/XMLHttpRequest) request object, most typically:
    * `withCredentials` [boolean]: whether to send cross domain requests with authorization headers/cookies. Useful if you're making cross sub-domain requests with a root-domain auth cookie.
* `beforeSend` [function]: beforeSend will be called before the request is made, and will be passed the raw `xhr` object if you wish to modify it directly before it's sent.

```javascript
var Person = AmpersandModel.extend({
    urlRoot: 'http://otherdomain.example.com/people',

    ajaxConfig: function () {
        return {
            headers: {
                'Access-Token': this.accessToken
            },
            xhrFields: {
                'withCredentials': true
            }
        };
    }
});

var me = new Person({ id: 123 });
me.fetch();
```

### url `model.url or model.url()`

The relative url that the model should use to edit the resource on the server.  By default, `url` is constructed by sniffing for the model's `urlRoot` or the model's collection `url`, if present, then appending the `idAttribute` if the model has not yet been saved.  However, if the model does not follow normal REST endpoint conventions, you may overwrite it.  In such a case, `url` may be absolute.

```js
// overwrite `url()` example
var Person = AmpersandModel.extend({
    props: {
        id: 'number',
        name: 'string'
    },
    url: function() {
        var base = _.result(this, "urlRoot");
        if (this.isNew()) return base;
        return base + '/' + someCustomActionOnServerId(this.getId());
    },
    urlRoot: function() {
        return '/api/' + me.apiVersion + '/persons';
    }
});

var bob = new Person({id: 1234, name: 'bob'});
console.log(bob.urlRoot()); //=> /api/v1/persons
console.log(bob.url()); //=> /api/v1/persons/some/CustomId-bob-1234
```

### urlRoot `model.urlRoot or model.urlRoot()`

The base url to use for fetching this model. This is useful if the model is *not* in a collection and you still want to set a fixed "root" but have a dynamic model.url(). Can also be a function.

If your model is in a collection that has a `url` you won't need this, because the model will try to build the URL from its collection.

```js
var Person = AmpersandModel.extend({
    props: {
        id: 'string',
        name: 'string'
    },
    urlRoot: '/api/persons'
});

var bob = new Person({id: "1234"});

console.log(bob.url()); //=> "/api/persons/1234"
```

## License

MIT
