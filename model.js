var Backbone = require('backbone'),
    Capsule = require('capsule'),
    _ = require('underscore');


var Shave = {};

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

// Sugar for defining properties a la ES5.
var Mixins = Shave.Mixins = {
    // shortcut for Object.defineProperty
    define: function (name, def) {
        Object.defineProperty(this, name, def);
    },
    defineGetter: function (name, handler) {
        this.define(name, {
            get: handler.bind(this)
        });
    },
    defineSetter: function (name, handler) {
        this.define(name, {
            set: handler.bind(this)
        });
    }
};

// global model storage
Shave.registry = {};

Shave.getModel = function (type, id, ns) {
    var reg = Shave.registry;
    if (ns) {
        return reg[ns] && reg[ns][type + id];
    } else {
        return reg[type + id];
    }
};

// MODEL
var Model = Shave.Model = function (attrs, options) {
    var modelFound,
        opts = _.defaults(options || {}, {
            seal: true
        });

    // always return model initted model if we've already got it in cache.
    if (attrs.id) {
        /*
        if (modelFound = Shave.registry.lookup(this.type, attrs.id, opts.namespace)) {
            console.log('found it', modelFound.attrs, modelFound.type);
            return modelFound;
        }
        */
    }
    this._namespace = opts.namespace;
    _.extend(this, Backbone.Events);
    this._initted = false;
    this._deps = {};
    this._initProperties();
    this._initCollections();
    this._cache = {};
    for (var item in attrs) {
        this[item] = attrs[item];
    }
    this.init.apply(this, arguments);
    if (attrs.id) this.register(attrs.id);
    this.previous = this.attributes;
    this._initted = true;
};


_.extend(Model.prototype, Mixins, {
    // stubbed out to be overwritten
    init: function () {},

    register: function (id) {
        var ns = this._namespace,
            registry = (ns) ? (Shave.registry[ns] || (Shave.registry[ns] = {})) : Shave.registry;
        registry[this.type + id] = this;
    },

    // for multi-set
    set: function (attrs, value) {
        if (typeof attrs === 'string' && typeof value !== 'undefined') {
            this[attrs] = value;
        } else {
            for (var attr in attrs) this[attr] = attrs[attr];
        }
    },

    get: function (attr) {
        return this[attr];
    },

    // convenience methods for manipulating array properties
    addListVal: function (prop, value, prepend) {
        var list = _.clone(this[prop]) || [];
        if (!_(list).contains(value)) {
            list[prepend ? 'unshift' : 'push'](value);
            this[prop] = list;
        }
        return this;
    },
    removeListVal: function (prop, value) {
        var list = _.clone(this[prop]) || [];
        if (_(list).contains(value)) {
            this[prop] = _(list).without(value);
        }
        return this;
    },
    hasListVal: function (prop, value) {
        return _.contains(this[prop] || [], value);
    },

    _initCollections: function () {
        var coll;
        if (!this.collections) return;
        for (coll in this.collections) {
            this[coll] = new this.collections[coll]();
            this[coll].parent = this;
        }
    },

    _initProperties: function () {
        var self = this,
            definition = this.definition = {},
            val,
            prop,
            item,
            type,
            filler;

        this.cid = _.uniqueId('model');

        function addToDef(name, val, isSession) {
            var def = definition[name] = {};
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
                if (val.setOnce) def.setOnce = true;
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

        // always add "id" as a definition or make sure it's 'setOnce'
        if (definition.id) {
            definition.id.setOnce = true;
        } else {
            addToDef('id', {setOnce: true});
        }

        // register derived properties as part of the definition
        this._registerDerived();
        this._createGettersSetters();

        // freeze attributes used to define object
        if (this.session) Object.freeze(this.session);
        //if (this.derived) Object.freeze(this.derived);
        if (this.props) Object.freeze(this.props);
    },
    // just makes friendlier errors when trying to define a new model
    // only used when setting up original property definitions
    _ensureValidType: function (type) {
        return _.contains(['string', 'number', 'boolean', 'array', 'object', 'date'], type) ? type : undefined;
    },
    _validate: function () { return true; },
    _createGettersSetters: function () {
        var item, def, desc, self = this;

        // create getters/setters based on definitions
        for (item in this.definition) {
            def = this.definition[item];
            desc = {};
            // create our setter
            desc.set = function (def, item, self) {
                return function (val, options) {
                    var opts = options || {},
                        newType = typeof val,
                        interpretedType,
                        newVal = val;

                    // check type if we have one
                    if (def.type === 'date') {
                        if (!_.isDate(val)) {
                            try {
                                newVal = (new Date(parseInt(val, 10))).valueOf();
                                newType = 'date';
                            } catch (e) {
                                newType = typeof val;
                            }
                        } else {
                            newType = 'date';
                            newVal = val.valueOf();
                        }
                    } else if (def.type === 'array') {
                        newType = _.isArray(val) ? 'array' : typeof val;
                    } else if (def.type === 'object') {
                        // we have to have a way of supporting "missing" objects. Null is an object, but
                        // setting a value to undefined should work too, IMO.
                        // We just override it, in that case.
                        if (typeof val !== 'object' && _.isUndefined(val)) {
                            newVal = null;
                            newType = 'object';
                        }
                    }

                    if (def.type !== newType) {
                        throw new TypeError('Property \'' + item + '\' must be of type ' + def.type + '. Tried to set ' + val);
                    }

                    // if trying to set id after it's already been set
                    // reject that
                    if (def.setOnce && def.value !== undefined && !_.isEqual(def.value, newVal)) throw new TypeError('Property \'' + item + '\' can only be set once.');

                    this.previous = this.attributes;

                    // only change if different
                    if (!_.isEqual(def.value, newVal)) {
                        def.value = newVal;
                        // trigger change
                        if (self._initted) {
                            self.trigger('change:' + item, self, newVal);
                            (self._deps[item] || []).forEach(function (derTrigger) {
                                // blow away our cache
                                delete self._cache[derTrigger];
                                self.trigger('change:' + derTrigger, self, self.derived[derTrigger]);
                            });
                        }
                        this.previous = this.attributes;
                    }
                };
            }(def, item, self);
            // create our getter
            desc.get = function (def, attributes) {
                return function (val) {
                    if (typeof def.value !== 'undefined') {
                        if (def.type === 'date') {
                            return new Date(def.value);
                        }
                        return def.value;
                    }
                    return;
                };
            }(def);

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

            // defined a top-level getter for derived keys
            this.define(key, {
                get: _.bind(function (key) {
                    // is this a derived property we should cache?
                    if (this._derived[key].cache) {
                        // do we have it?
                        if (this._cache.hasOwnProperty(key)) {
                            return this._cache[key];
                        } else {
                            return this._cache[key] = this._derived[key].fn.apply(this);
                        }
                    } else {
                        return this._derived[key].fn.apply(this);
                    }
                }, this, key),
                set: _.bind(function (key) {
                    throw TypeError(key + ' is a derived property, you can\'t set it directly');
                }, this, key)
            });
        }
    }
});

Shave.Model.extend = extend;

module.exports = Shave;
