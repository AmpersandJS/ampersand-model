var _ = require('underscore'),
    Shave = {};

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


// MODEL
Shave.Model = function (attributes) {
    for (var attr in attributes) {
      this[attr] = attributes[attr];
    }
    this._deps = {};
    this.initProperties();
    this.initialize.apply(this, arguments);
}

// tack on our extend function
Shave.Model.extend = extend;



// MODEL prototype
Object.defineProperty(Shave.Model.prototype, 'initProperties', {
    value: function () {
        var val, prop, def, type, filler;
        
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
                filler = val[2] || val.default;
                if (filler) def.default = filler;
                if (val[3] || val.ignore) def.ignore = true;
            }
        }

        // register derived properties as part of the definition
        this._registerDerived();
        this.createGettersSetters();
        // freeze our props and definition
        Object.freeze(this.props);
        Object.freeze(this.definition);
    }
});

Object.defineProperty(Shave.Model.prototype, 'createGettersSetters', {
    value: function () {
      var item, def;
      // create getters/setters based on definitions
      for (item in this.definition) {
        def = this.definition[item];
        desc = {};
        // create our setter
        desc.set = function (def, item) {
            return function (val) {
              // check type if we have one
              if (def.type && typeof val !== def.type) {
                throw new TypeError('Property \'' + item + '\' must be of type ' + def.type); 
              }
            };
        }(def, item);
        // create our getter
        desc.get = function () {
          
        };
        //desc.writable = !def.readonly;
        
        // define our property
        console.log(item, desc.set);
        Object.defineProperty(this, item, desc);
      }
    }
});

//Object.defineProperty(Shave.Model.prototype, )

_.extend(Shave.Model.prototype, {
    // container for our raw values
    _raw: {},
    
    // stubbed out to be overwritten
    initialize: function(){},
    
    // just makes friendlier errors when trying to define a new model
    // only used when setting up original property definitions
    _ensureValidType: function (type) {
      return _.contains(['string', 'number', 'bool', 'array', 'object', 'date'], type) ? type : undefined;
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
    },
  });

  


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


console.log(model);