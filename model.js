var Shave = {};

// HELPERS
// Shared empty constructor function to aid in prototype-chain creation.
var ctor = function(){};

// Helper function to correctly set up the prototype chain, for subclasses.
// Similar to `goog.inherits`, but uses a hash of prototype properties and
// class properties to be extended.
var inherits = function(parent, protoProps, staticProps) {
    var child;

    // The constructor function for the new subclass is either defined by you
    // (the "constructor" property in your `extend` definition), or defaulted
    // by us to simply call the parent's constructor.
    if (protoProps && protoProps.hasOwnProperty('constructor')) {
      child = protoProps.constructor;
    } else {
      child = function(){ parent.apply(this, arguments); };
    }

    // Inherit class (static) properties from parent.
    _.extend(child, parent);

    // Set the prototype chain to inherit from `parent`, without calling
    // `parent`'s constructor function.
    ctor.prototype = parent.prototype;
    child.prototype = new ctor();

    // Add prototype properties (instance properties) to the subclass,
    // if supplied.
    if (protoProps) _.extend(child.prototype, protoProps);

    // Add static properties to the constructor function, if supplied.
    if (staticProps) _.extend(child, staticProps);

    // Correctly set child's `prototype.constructor`.
    child.prototype.constructor = child;

    // Set a convenience property in case the parent's prototype is needed later.
    child.__super__ = parent.prototype;

    return child;
};

var extend = function (protoProps, classProps) {
    var child = inherits(this, protoProps, classProps);
    child.extend = this.extend;
    return child;
};

Shave.Events = {

    // Bind an event, specified by a string name, `ev`, to a `callback`
    // function. Passing `"all"` will bind the callback to all events fired.
    on: function(events, callback, context) {
      var ev;
      events = events.split(/\s+/);
      var calls = this._callbacks || (this._callbacks = {});
      while (ev = events.shift()) {
        // Create an immutable callback list, allowing traversal during
        // modification.  The tail is an empty object that will always be used
        // as the next node.
        var list  = calls[ev] || (calls[ev] = {});
        var tail = list.tail || (list.tail = list.next = {});
        tail.callback = callback;
        tail.context = context;
        list.tail = tail.next = {};
      }
      return this;
    },

    // Remove one or many callbacks. If `context` is null, removes all callbacks
    // with that function. If `callback` is null, removes all callbacks for the
    // event. If `ev` is null, removes all bound callbacks for all events.
    off: function(events, callback, context) {
      var ev, calls, node;
      if (!events) {
        delete this._callbacks;
      } else if (calls = this._callbacks) {
        events = events.split(/\s+/);
        while (ev = events.shift()) {
          node = calls[ev];
          delete calls[ev];
          if (!callback || !node) continue;
          // Create a new list, omitting the indicated event/context pairs.
          while ((node = node.next) && node.next) {
            if (node.callback === callback &&
              (!context || node.context === context)) continue;
            this.on(ev, node.callback, node.context);
          }
        }
      }
      return this;
    },

    // Trigger an event, firing all bound callbacks. Callbacks are passed the
    // same arguments as `trigger` is, apart from the event name.
    // Listening for `"all"` passes the true event name as the first argument.
    trigger: function(events) {
      var event, node, calls, tail, args, all, rest;
      if (!(calls = this._callbacks)) return this;
      all = calls['all'];
      (events = events.split(/\s+/)).push(null);
      // Save references to the current heads & tails.
      while (event = events.shift()) {
        if (all) events.push({next: all.next, tail: all.tail, event: event});
        if (!(node = calls[event])) continue;
        events.push({next: node.next, tail: node.tail});
      }
      // Traverse each list, stopping when the saved tail is reached.
      rest = slice.call(arguments, 1);
      while (node = events.pop()) {
        tail = node.tail;
        args = node.event ? [node.event].concat(rest) : rest;
        while ((node = node.next) !== tail) {
          node.callback.apply(node.context || this, args);
        }
      }
      return this;
    }

  };

Shave.Mixins = {
    // shortcut to define
    define: function (name, def) {
        Object.defineProperty(this, name, def);
    }
}

// MODEL
Shave.Model = function (attributes) {
    for (var attr in attributes) {
        this[attr] = attributes[attr];
    }
    this._deps = {};
    this._initProperties();
    this.initialize.apply(this, arguments);
    Object.preventExtensions(this);
}

// tack on our extend function
Shave.Model.extend = extend;


_.extend(Shave.Model.prototype, Shave.Events, Shave.Mixins, {
    // stubbed out to be overwritten
    initialize: function(){},

    _initProperties: function () {
        var val, prop, def, type, filler, self = this;
        
        this.definition = {};
        // loop through given properties
        for (prop in this.props) {
            val = this.props[prop];
            this.definition[prop] = def = {};
            if (_.isString(val)) {
                // grab our type if all we've got is a string
                type = this._ensureValidType(val);
                if (type) def.type = type;
            } else {
                type = this._ensureValidType(val[0] || val.type);
                if (type) def.type = type;
                if (val[1] || val.required) def.required = true;
                // set default if defined
                filler = val[2] || val.default;
                if (filler) def.value = filler;
                if (val[3] || val.ignore) def.ignore = true;
            }
        }

        // register derived properties as part of the definition
        this._registerDerived();
        this._createGettersSetters();
        // freeze our props and definition
        Object.freeze(this.props);
        //Object.freeze(this.definition);
    },
    // just makes friendlier errors when trying to define a new model
    // only used when setting up original property definitions
    _ensureValidType: function (type) {
      return _.contains(['string', 'number', 'bool', 'array', 'object', 'date'], type) ? type : undefined;
    },
    _createGettersSetters: function () {
        var item, def, desc, self = this;
          // create getters/setters based on definitions
          for (item in this.definition) {
            def = this.definition[item];
            desc = {};
            // create our setter
            desc.set = function (def, item, self) {
                return function (val) {
                    var newVal;
                    // check type if we have one
                    switch (def.type) {
                    case 'date':
                        if (!_.isDate(val)) {
                            throw new TypeError('Property \'' + item + '\' must be of type ' + def.type);
                        }
                        newVal = val.valueOf(val);
                        break;
                    default: 
                        // handles string/number/object
                        if (def.type && typeof val !== def.type) {
                            throw new TypeError('Property \'' + item + '\' must be of type ' + def.type); 
                        }
                        newVal = val;
                        break;
                    }

                    // only change if different
                    if (!_.isEqual(def.value, newVal)) {
                        // trigger change
                        self.trigger('change:' + item, self, newVal);
                        def.value = newVal;
                    }
                };
            }(def, item, self);
            // create our getter
            desc.get = function (def, attributes) {
                return function (val) {
                    if (def.value) {
                        if (def.type === 'date') {
                            return new Date(def.value);
                        }
                        return def.value;
                    }
                    return ;
                }
            }(def);
            //desc.writable = !def.readonly;
            
            // define our property
            this.define(item, desc);
        }

        this.define('attributes', {
            get: function (self) {
                return function () {
                    var res = {};
                    for (var item in self.definition) {
                        res[item] = self[item];
                    }
                    return res;
                }
            }(this)
        })

        this.define('keys', {
            get: function (self) {
                return function () {
                    return Object.keys(self.attributes);
                }
            }(this)
        })
    },
    // stores an object of arrays that specifies the derivedProperties
    // that depend on each attribute
    _registerDerived: function () {
      var self = this, depList;
      if (!this.derived) return;
      for (var key in this.derived) {
        depList = this.derived[key];
        _.each(depList, function (dep) {
          self._deps[dep] = _(self._deps[dep] || []).union([key]);
        }); 
      }
    }
})


// simple test case
var MyModel = Shave.Model.extend({
    props: {
        firstName: ['string', true],
        lastName: ['string', true],
        age: ['number', false, 12],
        awesome: ['bool', false, null, true],
        hairColors: 'array',
        meta: {
            type: 'object'
        },
        favoriteColor: {
            type: 'string',
            default: 'blue',
            validator: function (val) {
                return _.contains(['red', 'green', 'blue'], val);
            },
            required: true,
            local: false
        },
        birthDate: 'date'
    },
    derived: {
        fullName: ['firstName', 'lastName']
    },
    fullName: function () {
        return this.get('firstName') + ' ' + this.get('lastName');
    }
});

var model = new MyModel({
    firstName: "henrik"
});

model.firstName = "332342";


//console.log(model, definition);