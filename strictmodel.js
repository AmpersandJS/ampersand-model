//   (c) 2013 Henrik Joreteg
//   MIT Licensed
//   For all details and documentation:
//   https://github.com/HenrikJoreteg/StrictModel
(function () {
  'use strict';

  // Initial setup
  // -------------

  // Establish the root object, `window` in the browser, or `global` on the server.
  var root = this;

  // The top-level namespace. All public Backbone classes and modules will
  // be attached to this. Exported for both CommonJS and the browser.
  var Strict = typeof exports !== 'undefined' ? exports : root.Strict = {},
    toString = Object.prototype.toString,
    slice = Array.prototype.slice;

  // Current version of the library. Keep in sync with `package.json`.
  Strict.VERSION = '0.0.1';

  // Require Underscore, if we're on the server, and it's not already present.
  var _ = root._;
  if (!_ && (typeof require !== 'undefined')) _ = require('underscore');

  // Require Backbone, if we're on the server, and it's not already present.
  var Backbone = root.Backbone;
  if (!Backbone && (typeof require !== 'undefined')) Backbone = require('backbone');

  // Backbone Collection compatibility fix:
  // In backbone, when you add an already instantiated model to a collection
  // the collection checks to see if what you're adding is already a model
  // the problem is, it does this witn an instanceof check. We're wanting to
  // use completely different models so the instanceof will fail even if they
  // are "real" models. So we work around this by overwriting this method from
  // backbone 1.0.0. The only difference is it compares against our Strict.Model
  // instead of backbone's.
  Backbone.Collection.prototype._prepareModel = function (attrs, options) {
    if (attrs instanceof Strict.Model) {
      if (!attrs.collection) attrs.collection = this;
      return attrs;
    }
    options || (options = {});
    options.collection = this;
    var model = new this.model(attrs, options);
    if (!model._validate(attrs, options)) {
      this.trigger('invalid', this, attrs, options);
      return false;
    }
    return model;
  };

  // Helpers
  // -------

  // Shared empty constructor function to aid in prototype-chain creation.
  var Constructor = function () {};

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
      child = function () { return parent.apply(this, arguments); };
    }

    // Inherit class (static) properties from parent.
    _.extend(child, parent);

    // Set the prototype chain to inherit from `parent`, without calling
    // `parent`'s constructor function.
    Constructor.prototype = parent.prototype;
    child.prototype = new Constructor();

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

  // Mixins
  // ------

  // Sugar for defining properties a la ES5.
  var Mixins = Strict.Mixins = {
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

  // Strict.Registry
  // ---------------

  // Internal storage for models, seperate namespace
  // storage from default to prevent collision of matching
  // model type+id and namespace name

  var Registry = Strict.Registry = function () {
    this._cache = {};
    this._namespaces = {};
  };

  // Attach all inheritable methods to the Registry prototype.
  _.extend(Registry.prototype, {
    // Get the general or namespaced internal cache
    _getCache: function (ns) {
      if (ns) {
        this._namespaces[ns] || (this._namespaces[ns] = {});
        return this._namespaces[ns];
      }
      return this._cache;
    },

    // Find the cached model
    lookup: function (type, id, ns) {
      var cache = this._getCache(ns);
      return cache && cache[type + id];
    },

    // Add a model to the cache if it has not already been set
    store: function (model) {
      var cache = this._getCache(model._namespace),
        key = model.type + model.getId();
      // Prevent overriding a previously stored model
      cache[key] = cache[key] || model;
      return this;
    },

    // Remove a stored model from the cache, return `true` if removed
    remove: function (type, id, ns) {
      var cache = this._getCache(ns);
      if (this.lookup.apply(this, arguments)) {
        delete cache[type + id];
        return true;
      }
      return false;
    },

    // Reset internal cache
    clear: function () {
      this._cache = {};
      this._namespaces = {};
    }
  });

  // Create the default Strict.registry.
  Strict.registry = new Registry();

  // Strict.Model
  // ------------

  var Model = Strict.Model = function (attrs, options) {
    attrs || (attrs = {});
    options || (options = {});

    // set the collection if passed in
    this.collection = options.collection || undefined;
    if (options.parse) attrs = this.parse(attrs, options) || {};
    options._attrs = attrs;
    this._namespace = options.namespace;
    this._initted = false;
    this._deps = {};
    this._initProperties();
    this._initCollections();
    this._cache = {};
    this._verifyRequired();
    this.set(attrs, _.extend({silent: true}, options));
    this.changed = {};
    this.initialize.apply(this, arguments);
    if (attrs[this.idAttribute]) Strict.registry.store(this);
    this._initted = true;
    this._previousAttributes = {};
    if (this.seal) {
      Object.seal(this);
    }
  };

  // Attach all inheritable methods to the Model prototype.
  _.extend(Model.prototype, Backbone.Events, Mixins, {
    idAttribute: 'id',

    getId: function () {
      return this.get(this.idAttribute);
    },

    // stubbed out to be overwritten
    initialize: function () {
      return this;
    },

    // backbone compatibility
    parse: function (resp, options) {
      return resp;
    },

    // Remove model from the registry and unbind events
    remove: function () {
      if (this.getId()) {
        Strict.registry.remove(this.type, this.getId(), this._namespace);
      }
      this.trigger('remove', this);
      this.off();
      return this;
    },

    set: function (key, value, options) {
      var self = this,
        changing,
        current,
        previous,
        changes,
        newType,
        interpretedType,
        newVal,
        def,
        attr,
        attrs,
        silent,
        unset,
        val;

      // Handle both `"key", value` and `{key: value}` -style arguments.
      if (_.isObject(key) || key === null) {
        attrs = key;
        options = value;
      } else {
        attrs = {};
        attrs[key] = value;
      }

      options = options || {};

      if (!this._validate(attrs, options)) return false;

      // Extract attributes and options.
      unset = options.unset;
      silent = options.silent;
      changes = [];
      changing = this._changing;
      this._changing  = true;

      // if not already changing, store previous
      if (!changing) {
        this._previousAttributes = this._getAttributes(true);
        this.changed = {};
      }
      current = this.attributes;
      previous = this._previousAttributes;

      // For each `set` attribute...
      for (attr in attrs) {
        val = attrs[attr];
        newType = typeof val;
        newVal = val;

        def = this.definition[attr] || {};

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
          // we have to have a way of supporting "missing" objects.
          // Null is an object, but setting a value to undefined
          // should work too, IMO. We just override it, in that case.
          if (typeof val !== 'object' && _.isUndefined(val)) {
            newVal = null;
            newType = 'object';
          }
        }

        // If we have a defined type and the new type doesn't match, throw error.
        // Unless it's not required and the value is undefined.
        if (def.type && def.type !== newType && (!def.required && !_.isUndefined(val))) {
          throw new TypeError('Property \'' + attr + '\' must be of type ' + def.type + '. Tried to set ' + val);
        }

        // if trying to set id after it's already been set
        // reject that
        if (def.setOnce && def.value !== undefined && !_.isEqual(def.value, newVal)) {
          throw new TypeError('Property \'' + key + '\' can only be set once.');
        }

        // push to changes array if different
        if (!_.isEqual(def.value, newVal)) {
          changes.push({prev: def.value, val: newVal, key: attr});
        }

        // keep track of changed attributes
        if (!_.isEqual(previous[attr], val)) {
          self.changed[attr] = val;
        } else {
          delete self.changed[attr];
        }
      }

      // actually update our values
      _.each(changes, function (change) {
        self._previousAttributes && (self._previousAttributes[change.key] = change.prev);
        if (unset) {
          delete self.definition[change.key].value;
        } else {
          self.definition[change.key].value = change.val;
        }
      });

      if (!silent) {
        if (changes.length) self._pending = true;
        _.each(changes, function (change) {
          self.trigger('change:' + change.key, self, self[change.key]);
          (self._deps[change.key] || []).forEach(function (derTrigger) {
            // blow away our cache
            delete self._cache[derTrigger];
            self.trigger('change:' + derTrigger, self, self.derived[derTrigger]);
          });
        });
      }

      // You might be wondering why there's a `while` loop here. Changes can
      // be recursively nested within `"change"` events.
      if (changing) return this;
      if (!silent) {
        while (this._pending) {
          this._pending = false;
          this.trigger('change', this, options);
        }
      }
      this._pending = false;
      this._changing = false;
      return this;
    },

    get: function (attr) {
      return this[attr];
    },

    // Get all of the attributes of the model at the time of the previous
    // `"change"` event.
    previousAttributes: function () {
      return _.clone(this._previousAttributes);
    },

    save: function (key, val, options) {
      var attrs, method, xhr, attributes = this.attributes;

      // Handle both `"key", value` and `{key: value}` -style arguments.
      if (key == null || typeof key === 'object') {
        attrs = key;
        options = val;
      } else {
        (attrs = {})[key] = val;
      }

      options = _.extend({validate: true}, options);

      // If we're not waiting and attributes exist, save acts as
      // `set(attr).save(null, opts)` with validation. Otherwise, check if
      // the model will be valid when the attributes, if any, are set.
      if (attrs && !options.wait) {
        if (!this.set(attrs, options)) return false;
      } else {
        if (!this._validate(attrs, options)) return false;
      }

      // After a successful server-side save, the client is (optionally)
      // updated with the server-side state.
      if (options.parse === void 0) options.parse = true;
      var model = this;
      var success = options.success;
      options.success = function (resp) {
        var serverAttrs = model.parse(resp, options);
        if (options.wait) serverAttrs = _.extend(attrs || {}, serverAttrs);
        if (_.isObject(serverAttrs) && !model.set(serverAttrs, options)) {
          return false;
        }
        if (success) success(model, resp, options);
        model.trigger('sync', model, resp, options);
      };
      wrapError(this, options);

      method = this.isNew() ? 'create' : (options.patch ? 'patch' : 'update');
      if (method === 'patch') options.attrs = attrs;
      // if we're waiting we haven't actually set our attributes yet so
      // we need to do make sure we send right data
      if (options.wait) options.attrs = _.extend(model.attributes, attrs);
      xhr = this.sync(method, this, options);

      return xhr;
    },

    // Fetch the model from the server. If the server's representation of the
    // model differs from its current attributes, they will be overridden,
    // triggering a `"change"` event.
    fetch: function (options) {
      options = options ? _.clone(options) : {};
      if (options.parse === void 0) options.parse = true;
      var model = this;
      var success = options.success;
      options.success = function (resp) {
        //if (!model.set(model.parse(resp, options), options)) return false;
        if (success) success(model, resp, options);
        model.trigger('sync', model, resp, options);
      };
      wrapError(this, options);
      return this.sync('read', this, options);
    },

    // Destroy this model on the server if it was already persisted.
    // Optimistically removes the model from its collection, if it has one.
    // If `wait: true` is passed, waits for the server to respond before removal.
    destroy: function (options) {
      options = options ? _.clone(options) : {};
      var model = this;
      var success = options.success;

      var destroy = function () {
        model.trigger('destroy', model, model.collection, options);
      };

      options.success = function (resp) {
        if (options.wait || model.isNew()) destroy();
        if (success) success(model, resp, options);
        if (!model.isNew()) model.trigger('sync', model, resp, options);
      };

      if (this.isNew()) {
        options.success();
        return false;
      }
      wrapError(this, options);

      var xhr = this.sync('delete', this, options);
      if (!options.wait) destroy();
      return xhr;
    },

    // Determine if the model has changed since the last `"change"` event.
    // If you specify an attribute name, determine if that attribute has changed.
    hasChanged: function (attr) {
      if (attr == null) return !_.isEmpty(this.changed);
      return _.has(this.changed, attr);
    },

    // Return an object containing all the attributes that have changed, or
    // false if there are no changed attributes. Useful for determining what
    // parts of a view need to be updated and/or what attributes need to be
    // persisted to the server. Unset attributes will be set to undefined.
    // You can also pass an attributes object to diff against the model,
    // determining if there *would be* a change.
    changedAttributes: function (diff) {
      if (!diff) return this.hasChanged() ? _.clone(this.changed) : false;
      var val, changed = false;
      var old = this._changing ? this._previousAttributes : this._getAttributes(true);
      for (var attr in diff) {
        if (_.isEqual(old[attr], (val = diff[attr]))) continue;
        (changed || (changed = {}))[attr] = val;
      }
      return changed;
    },

    toJSON: function () {
      return this.attributes;
    },

    // Returns `true` if the attribute contains a value that is not null
    // or undefined.
    has: function (attr) {
      return this.get(attr) != null;
    },

    // Default URL for the model's representation on the server -- if you're
    // using Backbone's restful methods, override this to change the endpoint
    // that will be called.
    url: function () {
      var base = _.result(this, 'urlRoot') || _.result(this.collection, 'url') || urlError();
      if (this.isNew()) return base;
      return base + (base.charAt(base.length - 1) === '/' ? '' : '/') + encodeURIComponent(this.getId());
    },

    // A model is new if it has never been saved to the server, and lacks an id.
    isNew: function () {
      return this.getId() == null;
    },

    // return copy of model
    clone: function () {
      return new this.constructor(this._getAttributes(true));
    },

    // Check if the model is currently in a valid state.
    isValid: function (options) {
      return this._validate({}, _.extend(options || {}, { validate: true }));
    },

    // return escaped property
    escape: function (attr) {
      return _.escape(this[attr]);
    },

    // Proxy `Backbone.sync` by default -- but override this if you need
    // custom syncing semantics for *this* particular model.
    sync: function () {
      return Backbone.sync.apply(this, arguments);
    },

    unset: function (attr, options) {
      var def = this.definition[attr];
      var type = def.type;
      var val;
      if (def.required) {
        if (!_.isUndefined(def.default)) {
          val = def.default;
        } else if (type === 'string') {
          val = '';
        } else if (type === 'object') {
          val = {};
        } else if (type === 'array') {
          val = [];
        }
        return this.set(attr, val, options);
      } else {
        return this.set(attr, val, _.extend({}, options, {unset: true}));
      }
    },

    clear: function (options) {
      var self = this;
      _.each(this._getAttributes(true), function (val, key) {
        self.unset(key, options);
      });
      return this;
    },

    // Run validation against the next complete set of model attributes,
    // returning `true` if all is well. Otherwise, fire an `"invalid"` event.
    _validate: function (attrs, options) {
      if (!options.validate || !this.validate) return true;
      attrs = _.extend({}, this.attributes, attrs);
      var error = this.validationError = this.validate(attrs, options) || null;
      if (!error) return true;
      this.trigger('invalid', this, error, _.extend(options || {}, {validationError: error}));
      return false;
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

    previous: function (attr) {
      if (attr == null || !Object.keys(this._previousAttributes).length) return null;
      return this._previousAttributes[attr];
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

    // -----------------------------------------------------------------------

    _initCollections: function () {
      var coll;
      if (!this.collections) return;
      for (coll in this.collections) {
        this[coll] = new this.collections[coll]();
        this[coll].parent = this;
      }
    },

    // Check that all required attributes are present
    // TODO: should this throw an error or return boolean?
    _verifyRequired: function () {
      var attrs = this.attributes;
      for (var def in this.definition) {
        if (this.definition[def].required && typeof attrs[def] === 'undefined') {
          return false;
        }
      }
      return true;
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
          def.value = !_.isUndefined(val[2]) ? val[2] : val.default;
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
      if (definition[this.idAttributes]) {
        definition[this.idAttribute].setOnce = true;
      }

      // register derived properties as part of the definition
      this._registerDerived();
      this._createGettersSetters();

      // freeze attributes used to define object
      if (this.session) Object.freeze(this.session);
      if (this.derived) Object.freeze(this.derived);
      if (this.props) Object.freeze(this.props);
    },

    // just makes friendlier errors when trying to define a new model
    // only used when setting up original property definitions
    _ensureValidType: function (type) {
      return _.contains(['string', 'number', 'boolean', 'array', 'object', 'date'], type) ? type : undefined;
    },

    _createGettersSetters: function () {
      var item, def, desc, self = this;

      // create getters/setters based on definitions
      for (item in this.definition) {
        def = this.definition[item];
        desc = {};
        // create our setter
        desc.set = function (def, item) {
          return function (val, options) {
            self.set(item, val);
          };
        }(def, item);
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
        return this._getAttributes();
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
      var val;
      for (var item in this.definition) {
        if (!(!includeSession && this.definition[item].session)) {
          val = (raw) ? this.definition[item].value : this[item];
          if (val !== undefined) res[item] = val;
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
        depList = this.derived[key].deps || [];
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
            var deps = this._derived[key].deps,
              msg = '"' + key + '" is a derived property, you can\'t set it directly.';
            if (deps && deps.length) {
              throw new TypeError(msg + ' It is dependent on "' + deps.join('" and "') + '".');
            } else {
              throw new TypeError(msg);
            }
          }, this, key)
        });
      }
    }
  });

  // Underscore methods that we want to implement on the Model.
  var modelMethods = ['keys', 'values', 'pairs', 'invert', 'pick', 'omit'];

  // Mix in each Underscore method as a proxy to `Model#attributes`.
  _.each(modelMethods, function (method) {
    Model.prototype[method] = function () {
      var args = slice.call(arguments);
      args.unshift(this.attributes);
      return _[method].apply(_, args);
    };
  });

  // Set up inheritance for the model
  Strict.Model.extend = extend;

  Model.prototype.init = Model.prototype.initialize;

  // Wrap an optional error callback with a fallback error event.
  var wrapError = function (model, options) {
    var error = options.error;
    options.error = function (resp) {
      if (error) error(model, resp, options);
      model.trigger('error', model, resp, options);
    };
  };

  // Throw an error when a URL is needed, and none is supplied.
  var urlError = function () {
    throw new Error('A "url" property or function must be specified');
  };

}).call(this);
