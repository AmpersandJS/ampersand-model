(function () {
    "use strict";
    // Initial Setup
    // -------------

    // Save a reference to the global object (`window` in the browser, `global`
    // on the server).
    var root = this;

    // Save the previous value of the `Shave` variable, so that it can be
    // restored later on, if `noConflict` is used.
    var previousShave = root.Shave;

    // Create a local reference to slice/splice.
    var slice = Array.prototype.slice;
    var splice = Array.prototype.splice;

    // The top-level namespace. All public Shave classes and modules will
    // be attached to this. Exported for both CommonJS and the browser.
    var Shave;
    if (typeof exports !== 'undefined') {
        Shave = exports;
    } else {
        Shave = root.Shave = {};
    }

    // Current version of the library. Keep in sync with `package.json`.
    Shave.VERSION = '0.9.0';

    // Require Underscore, if we're on the server, and it's not already present.
    var _ = root._;
    if (!_ && (typeof require !== 'undefined')) _ = require('underscore');

    // For Shave's purposes, jQuery, Zepto, or Ender owns the `$` variable.
    var $ = root.jQuery || root.Zepto || root.ender;

    // Runs Shave.js in *noConflict* mode, returning the `Shave` variable
    // to its previous owner. Returns a reference to this Shave object.
    Shave.noConflict = function () {
        root.Shave = previousShave;
        return this;
    };

    // HELPERS
    // Shared empty constructor function to aid in prototype-chain creation.
    var ctor = function () {};

    // Helper function to correctly set up the prototype chain, for subclasses.
    // Similar to `goog.inherits`, but uses a hash of prototype properties and
    // class properties to be extended.
    var inherits = function (parent, protoProps, staticProps) {
        var child;

        // The constructor function for the new subclass is either defined by you
        // (the "constructor" property in your `extend` definition), or defaulted
        // by us to simply call the parent's constructor.
        if (protoProps && protoProps.hasOwnProperty('constructor')) {
            child = protoProps.constructor;
        } else {
            child = function () { parent.apply(this, arguments); };
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
        // our callback container
        _callbacks: {},
        
        // Bind an event, specified by a string name, `ev`, to a `callback`
        // function. Passing `"all"` will bind the callback to all events fired.
        on: function (events, callback, context) {
            var ev;
            events = events.split(/\s+/);
            var calls = this._callbacks;
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
        off: function (events, callback, context) {
            var ev, calls, node;
            if (!events) {
                this._callbacks = {};
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
        trigger: function (events) {
            var event, node, calls, tail, args, all, rest;
            if (!(calls = this._callbacks)) return this;
            all = calls.all;
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
        // shortcut for Object.defineProperty
        define: function (name, def) {
            Object.defineProperty(this, name, def);
        },
        defineGetter: function (name, handler) {
            this.define(name, {
                get: handler.bind(this)
            });
        }
    };

    // MODEL
    Shave.Model = function (attributes) {
        this._deps = {};
        this._initProperties();
        this.initialize.apply(this, arguments);
        //Object.preventExtensions(this);
    };

    // tack on our extend function
    Shave.Model.extend = extend;


    _.extend(Shave.Model.prototype, Shave.Events, Shave.Mixins, {
        // stubbed out to be overwritten
        initialize: function () {},

        set: function (attrs) {
            for (var attr in attrs) this[attr] = attrs[attr];
        },

        _initProperties: function () {
            var self = this,
                val, 
                prop, 
                item,
                def, 
                type, 
                filler;
            
            this.definition = {};

            function addToDef(name, val, isSession) {
                self.definition[name] = def = {};
                if (_.isString(val)) {
                    // grab our type if all we've got is a string
                    type = self._ensureValidType(val);
                    if (type) def.type = type;
                } else {
                    type = self._ensureValidType(val[0] || val.type);
                    if (type) def.type = type;
                    if (val[1] || val.required) def.required = true;
                    // set default if defined
                    filler = val[2] || val.default;
                    if (filler) def.value = filler;
                    if (isSession) def.session = true;
                }
            }

            // loop through given properties
            for (item in this.props) {
                addToDef(item, this.props[item]);
            }
            // loop through session props
            for (prop in this.session) {
                addToDef(prop, this.session[prop], true);
            }

            // register derived properties as part of the definition
            this._registerDerived();
            this._createGettersSetters();

            // prevent this thing from adding/removing properties
            Object.preventExtensions(this);
            Object.seal(this);

            // freeze attributes used to define object
            Object.freeze(this.session);
            Object.freeze(this.derived);
            Object.freeze(this.props);
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
                            (self._deps[item] || []).forEach(function (derTrigger) {
                                self.trigger('change:' + derTrigger, self, newVal);
                            });
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
                        return;
                    };
                }(def);
                //desc.writable = !def.readonly;
                
                // define our property
                this.define(item, desc);
            }

            this.defineGetter('attributes', function () {
                var res = {};
                for (var item in this.definition) res[item] = this[item];
                return res;
            });

            this.defineGetter('keys', function () {
                return Object.keys(this.attributes);
            });

            this.defineGetter('json', function () {
                return JSON.stringify(this._getAttributes(false, true));
            });

            this.defineGetter('derived', function () {
                var res = {};
                for (var item in this._derived) res[item] = this._derived[item].fn.apply(this);
                return res;
            });

            this.defineGetter('toTemplate', function () {
                return _.extend(this._getAttributes(true), this.derived);
            });
        },

        _getAttributes: function (includeSession, raw) {
            var res = {};
            for (var item in this.definition) {
                if (!includeSession) {
                    if (!this.definition[item].session) {
                        res[item] = (raw) ? this.definition[item].value : this[item];
                    }
                } else {
                    res[item] = (raw) ? this.definition[item].value : this[item];
                }
            }
            return res;
        },

        // stores an object of arrays that specifies the derivedProperties
        // that depend on each attribute
        _registerDerived: function () {
            var self = this, depList;
            if (!this.derived) return;
            this._derived = this.derived;
            for (var key in this.derived) {
                depList = this.derived[key].deps;
                if (!_.isArray(depList)) depList = [depList];
                _.each(depList, function (dep) {
                    self._deps[dep] = _(self._deps[dep] || []).union([key]);
                }); 
            }
        }
    });

}).call(this);

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
        fullName: {
            deps: ['firstName', 'lastName'],
            fn: function () {
                return this.firstName + ' ' + this.lastName;
            }
        },
        nickName: {
            deps: 'firstName',
            fn: function () {
                return this.firstName + 'ito';
            }
        }
    },
    session: {
        active: ['bool', true, true]
    }
});

var model = new MyModel({
    firstName: "henrik"
});

model.firstName = "332342";


//console.log(model, definition);