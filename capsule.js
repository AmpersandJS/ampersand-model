/*global */
(function () {
    // Module Setup
    // ------------

    // All public Capsule classes and modules will be attached to the `Capsule`
    // namespace. Exported for both CommonJS and the browser.
    var server = (typeof window === 'undefined'),
        Capsule,
        Backbone,
        _,
        uuid,
        templates;


    if (typeof exports !== 'undefined') {
        Backbone = require('backbone');
        _ = require('underscore')._;
        uuid = require('node-uuid');
        if (!server) templates = require('templates');
        Capsule = exports;
    } else {
        Backbone = this.Backbone;
        _ = this._;
        templates = window.templatizer;

        Capsule = this.Capsule || (this.Capsule = {});
    }

    // Flag so we know if we're on the server or not
    Capsule.server = server;

    // Our model hash, this is where all instantiated models are stored by id
    Capsule.models = {};




    // Capsule.Collection
    // ------------------

    // Extend Backbone collection with Capsule functionality
    Capsule.Collection = Backbone.Collection.extend({

        // ###register
        // Generates an `id` if on server and sets it in our reference hash.
        register: function (opts) {
            var ns = opts && opts.namespace;
            if (Capsule.server) {
                if (ns) this.namespace = ns;
                if (!this.id) this.id = ns + ':' + this.type;
            } else {
                // client
                if (this.id && !Capsule.models[this.id]) Capsule.models[this.id] = this;
            }
        },

        // ###registerRadioProperties
        // A convenience for creating `radio` properties where you can specify an
        // Array of properties in a collection and ensure that only model can have that
        // property set to `true`.
        // If we're adding stuff we need to make sure the added items don't violate the
        // radio property rule if it's already set.
        registerRadioProperties: function () {
            var collection = this;
            if (this.radioProperties) {
                _.each(this.radioProperties, function (property) {
                    collection.bind('change:' + property, function (changedModel) {
                        if (changedModel.get(property)) {
                            collection.each(function (model) {
                                var tempObj = {};
                                if (model.get(property) && model.cid !== changedModel.cid) {
                                    tempObj[property] = false;
                                    model.set(tempObj);
                                }
                            });
                        }
                    });
                    collection.bind('add', function (addedModel) {
                        var tempObj = {};
                        if (collection.select(function (model) {
                            return model.get(property);
                        }).length > 1) {
                            tempObj[property] = false;
                            addedModel.set(tempObj);
                        }
                    });
                });
            }
        },

        // ###filterByProperty
        // Shortcut for returning an array of models in the collection that have a certain `name` / `value`.
        filterByProperty: function (prop, value) {
            return this.filter(function (model) {
                return model.get(prop) === value;
            });
        },

        // ###findByProperty
        // Shortcut for finding first model in the collection with a certain `name` / `value`.
        findByProperty: function (prop, value) {
            return this.find(function (model) {
                return model.get(prop) === value;
            });
        },

        // ###setAll
        // Convenience for setting an attribute on all items in collection
        setAll: function (obj) {
            this.each(function (model) {
                model.set(obj);
            });
            return this;
        },

        // ###next
        // returns next item when given an item in the collection
        next: function (item, filter, start) {
            var i = this.indexOf(item),
                newItem;

            if (i === -1) {
                i = 0;
            } else if (i + 1 >= this.length) {
                i = 0;
            } else {
                i = i + 1;
            }
            newItem = this.at(i);
            if (filter && newItem !== start) {
                if (!filter(newItem)) {
                    return this.next(newItem, filter, start || item);
                }
            }
            return newItem;
        },

        // ###prev
        // returns previous item when given an item in the collection
        prev: function (item, filter, start) {
            var i = this.indexOf(item),
                newItem;
            if (i === -1) {
                i = 0;
            } else if (i === 0) {
                i = this.length - 1;
            } else {
                i = i - 1;
            }
            newItem = this.at(i);
            if (filter && newItem !== start) {
                if (!filter(newItem)) {
                    return this.prev(newItem, filter, start || item);
                }
            }
            return this.at(i);
        }
    });

    // #Capsule.View
    // Adding some conveniences to the Backbone view.
    Capsule.View = Backbone.View.extend({
        // ###handleBindings
        // This makes it simple to bind model attributes to the view.
        // To use it, add a `classBindings` and/or a `contentBindings` attribute
        // to your view and call `this.handleBindings()` at the end of your view's
        // `render` function. It's also used by `basicRender` which lets you do
        // a complete attribute-bound views with just this:
        //
        //         var ProfileView = Capsule.View.extend({
        //             template: 'profile',
        //             contentBindings: {
        //                 'name': '.name'
        //             },
        //             classBindings: {
        //                 'active': ''
        //             },
        //             render: function () {
        //                 this.basicRender();
        //                 return this;
        //             }
        //         });
        handleBindings: function () {
            var self = this;
            if (this.contentBindings) {
                _.each(this.contentBindings, function (selector, key) {
                    self.bindomatic(self.model, 'change:' + key, function () {
                        var el = (selector.length > 0) ? self.$(selector) : $(self.el);
                        el.html(self.model[key]);
                    });
                });
            }
            if (this.imageBindings) {
                _.each(this.imageBindings, function (selector, key) {
                    self.bindomatic(self.model, 'change:' + key, function () {
                        var el = (selector.length > 0) ? self.$(selector) : $(self.el);
                        el.attr('src', self.model[key]);
                    });
                });
            }
            if (this.hrefBindings) {
                _.each(this.hrefBindings, function (selector, key) {
                    self.bindomatic(self.model, 'change:' + key, function () {
                        var el = (selector.length > 0) ? self.$(selector) : $(self.el);
                        el.attr('href', self.model[key]);
                    });
                });
            }
            if (this.classBindings) {
                _.each(this.classBindings, function (selector, key) {
                    self.bindomatic(self.model, 'change:' + key, function () {
                        var newValue = self.model[key],
                            prevHash = self.model.previous,
                            prev = _.isFunction(prevHash) ? prevHash(key) : prevHash[key],
                            el = (selector.length > 0) ? self.$(selector) : $(self.el);
                        if (_.isBoolean(newValue)) {
                            if (newValue) {
                                el.addClass(key);
                            } else {
                                el.removeClass(key);
                            }
                        } else {
                            if (prev) el.removeClass(prev);
                            el.addClass(newValue);
                        }
                    }, {trigger: true});
                });
            }
            if (this.inputBindings) {
                _.each(this.inputBindings, function (selector, key) {
                    self.bindomatic(self.model, 'change:' + key, function () {
                        var el = (selector.length > 0) ? self.$(selector) : $(self.el);
                        el.val(self.model[key]);
                    }, {trigger: true});
                });
            }
            return this;
        },

        // ###desist
        // This is method we used to remove/unbind/destroy the view.
        // By default we fade it out this seemed like a reasonable default for realtime apps.
        // So things to just magically disappear and to give some visual indication that
        // it's going away. You can also pass an options hash `{quick: true}` to remove immediately.
        desist: function (opts) {
            opts || (opts = {});
            _.defaults(opts, {
                quick: false,
                animate: true,
                speed: 300,
                animationProps: {
                    height: 0,
                    opacity: 0
                }
            });
            var el = $(this.el);
            function kill() {
                el.unbind().remove();
            }
            if (this.interval) {
                clearInterval(this.interval);
                delete this.interval;
            }
            if (opts.quick) {
                kill();
            } else if (opts.animate) {
                el.animate(opts.animationProps, {
                    speed: opts.speed,
                    complete: kill
                });
            } else {
                setTimeout(kill, opts.speed);
            }
            this.unbindomatic();
        },

        // ###addReferences
        // This is a shortcut for adding reference to specific elements within your view for
        // access later. This is avoids excessive DOM queries and gives makes it easier to update
        // your view if your template changes. You could argue whether this is worth doing or not,
        // but I like it.
        // In your `render` method. Use it like so:
        //
        //         render: function () {
        //             this.basicRender();
        //             this.addReferences({
        //                 pages: '#pages',
        //                 chat: '#teamChat',
        //                 nav: 'nav#views ul',
        //                 me: '#me',
        //                 cheatSheet: '#cheatSheet',
        //                 omniBox: '#awesomeSauce'
        //             });
        //         }
        //
        // Then later you can access elements by reference like so: `this.$pages`, or `this.$chat`.
        addReferences: function (hash) {
            for (var item in hash) {
                this['$' + item] = $(hash[item], this.el);
            }
        },

        // ###autoSetInputs
        // Convenience for automagically setting all input values on the server
        // as-you-type. This is letter-by-letter syncing. You have to be careful with this
        // but it's very cool for some use-cases.
        // To use, just add a `data-type` attribute in your html in your template that
        // tells us which property the input corresponds to. For example:
        //
        //         <input data-type="title"/>
        //
        // Then if you call `this.autoSetInputs()` in your `render` function the values
        // will be sent to the server as you type.
        autoSetInputs: function () {
            this.$(':input').bind('input', _(this.genericKeyUp).bind(this));
        },

        // ###genericKeyUp
        // This is handy if you want to add any sort of as-you-type syncing
        // this is obviously traffic heavy, use wth caution.
        genericKeyUp: function (e) {
            var res = {},
                target = $(e.target),
                type;
            if (e.which === 13 && e.target.tagName.toLowerCase() === 'input') target.blur();
            res[type = target.data('type')] = target.val();
            this.model.setServer(res);
        },

        // ###basicRender
        // All the usual stuff when I render a view. It assumes that the view has a `template` property
        // that is the name of the ICanHaz template. You can also specify the template name by passing
        // it an options hash like so: `{templateKey: 'profile'}`.
        basicRender: function (opts) {
            var newEl;
            opts || (opts = {});
            _.defaults(opts, {
                templateFunc: (typeof this.template === 'string') ? templates[opts.templateKey] : this.template,
                context: false
            });
            newEl = $(opts.templateFunc(opts.context || this.addViewMixins(this.model.toTemplate)));
            $(this.el).replaceWith(newEl);
            this.setElement(newEl);
            this.handleBindings();
            this.delegateEvents();
        },

        // ###addViewMixins
        // Makes it possible for the view to definte `templateHelpers` array of functions or properties
        // that will be sent to the mustache template for rendering. Great for formatting etc
        // especially when it's specific to that view and doesn't really belong in your model code.
        addViewMixins: function (obj) {
            var self = this,
                models;
            if (this.templateHelpers) {
                _.each(this.templateHelpers, function (val) {
                    obj[val] = self[val]();
                });
            }
            if (this.templateMixins) {
                models = this.templateMixins();
                _.each(models, function (model) {
                    _.extend(obj, (model.toTemplate) ? model.toTemplate : model);
                });
            }

            return obj;
        },

        // ###subViewRender
        // This is handy for views within collections when you use `collectomatic`. Just like `basicRender` it assumes
        // that the view either has a `template` property or that you pass it an options object with the name of the
        // `templateKey` name of the ICanHaz template.
        // Additionally, it handles appending or prepending the view to its parent container.
        // It takes an options arg where you can optionally specify the `templateKey` and `placement` of the element.
        // If your collections is stacked newest first, just use `{plaement: 'prepend'}`.
        subViewRender: function (opts) {
            opts || (opts = {});
            _.defaults(opts, {
                placement: 'append',
                templateFunc: (typeof this.template === 'string') ? templates[opts.templateKey] : this.template
            });
            var data = _.isFunction(this.model.toTemplate) ? this.model.toTemplate() : this.model.toTemplate,
                newEl = $(opts.templateFunc(this.addViewMixins(data)))[0];
            if (!this.el.parentNode) {
                $(this.containerEl)[opts.placement](newEl);
            } else {
                $(this.el).replaceWith(newEl);
            }
            this.setElement(newEl);
            this.handleBindings();
        },

        // ###collectomatic
        // Shorthand for rendering collections and their invividual views.
        // Just pass it the collection, and the view to use for the items in the
        // collection. (anything in the `options` arg just gets passed through to
        // view. Again, props to @natevw for this.
        collectomatic: function (collection, ViewClass, options, desistOptions) {
            var views = {},
                self = this;
            function addView(model, collection, opts) {
                var matches = self.matchesFilters ? self.matchesFilters(model) : true;
                if (matches) {
                    views[model.cid] = new ViewClass(_({model: model}).extend(options));
                    views[model.cid].parent = self;
                }
            }
            this.bindomatic(collection, 'add', addView);
            this.bindomatic(collection, 'remove', function (model) {
                if (views[model.cid]) {
                    views[model.cid].desist(desistOptions);
                    delete views[model.cid];
                }
            });
            this.bindomatic(collection, 'refresh reset', function (opts) {
                _(views).each(function (view) {
                    view.desist({quick: true});
                });
                views = {};
                collection.each(addView);
            }, {trigger: true});
            this.bindomatic(collection, 'move', function () {
                _(views).each(function (view) {
                    view.desist({quick: true});
                });
                views = {};
                collection.each(addView);
            });
        }
    });


    // Capsule.BindUtils
    // -----------------

    /* takes the following options:
        {
            collection: <the collection>,
            filters: <object> // one or more filters,
            // if sorting we also need the following
            sortModel: <the model instance of the model that has our sort list>,
            sortProperty: <the attribute of the model that holds our list>
        }
    */
    // Smart collections is like a filtered/sorted view of a collection
    // it largely mimics the Capsule collection API. But is a nice abstraction for
    // dealing with filtered views of the data. This is what we use to make it easy
    // for to show partial of sorted views of the same underlying collection without
    // actually modifying the contents or sort order.
    Capsule.SmartCollection = function (options) {
        _.defaults(options, {
            filters: {},
            sortProperty: 'sortOrder',
            ordered: false
        });

        if (options.model && options.listProperty) {
            this.explicitlyListed = true;
        }

        if (options.comparator) {
            this.comparator = options.comparator;
        } else if (options.model && options.listProperty && options.explicitlySorted) {
            this.explicitlySorted = true;
        }

        // mix in all our goodies
        _.extend(this, options, Backbone.Events, Capsule.BindUtils);

        // set up our change handlers
        this.bindomatic(this.collection, 'all', this.eventPassthrough);
        this.bindomatic(this.collection, 'all', this.handleUnderlyingChange);
        //this.bindomatic(this.collection, 'add', this.handleAdd);
        if (this.model && this.sortProperty) {
            this.bindomatic(this.model, 'change:' + this.sortProperty, _.bind(this.trigger, this, 'refresh'));
        }
        this.initialize.apply(this, arguments);
    };

    _.extend(Capsule.SmartCollection.prototype, {
        initialize: function (options) {
            // stubbed out
        },

        eventPassthrough: function (eventName, model) {
            if (_.contains(['add', 'remove', 'reset'], eventName) && (!model || this.matchesFilters(model))) {
                this.trigger.call(this, eventName, arguments);
            }
        },

        handleUnderlyingChange: function (eventName) {
            var property = eventName.slice(0, 6) === 'change' ? eventName.slice(7) : undefined;
            if (_(_.keys(this.filters)).contains(property)) {
                this.trigger('refresh');
            }
            if (eventName === 'refresh') this.trigger('refresh');
        },

        handleAdd: function (model) {
            var args = _.toArray(arguments);
            if (this.matchesFilters(model)) {
                args.unshift('add');
                this.trigger.apply(this, args);
            }
        },

        toJSON: function () {
            return _.map(this.models(), function (model) {
                return model.toJSON;
            });
        },
        // a filter is a property name and a function for checking
        // if it that property matches. Each property can only have one filter
        addFilter: function (newFilter) {
            _(this.filters).extend(newFilter);
            this.trigger('refresh');
        },
        // this removes a property from the filters list
        removeFilter: function (property) {
            delete this.filters[property];
            this.trigger('refresh');
        },
        matchesFilters: function (modelOrId) {
            var model = (typeof modelOrId === 'string') ? this.collection.get(modelOrId) : modelOrId,
                filter,
                val,
                attr;

            for (filter in this.filters) {
                val = this.filters[filter];
                attr = model && model.get(filter);

                if (_.isFunction(val)) {
                    if (!val(model)) return false;
                } else if (_.isBoolean(val)) {
                    attr = !!attr; // coerce to bool
                    if (val != attr) return false;
                } else {
                    if (attr !== val) return false;
                }
            }
            return true;
        },
        models: function () {
            var models;
            if (this.explicitlyListed) {
                models = _.filter(this.getExplicit(), _.bind(this.matchesFilters, this));
            } else {
                models = this.collection.filter(_.bind(this.matchesFilters, this));
            }
            return this.comparator ? _.sortBy(models, this.comparator) : models;
        },
        getExplicit: function () {
            var self = this;
            return _.chain(this.model.get(this.listProperty))
                .map(function (id) {
                    return self.collection.get && self.collection.get(id) || _.find(self.collection, function (model) {model.id == id; });
                })
                .compact()
                .value();
        },
        get: function (id) {
            return _(this.models()).find(function (model) {
                return model.id;
            });
        },
        length: function () {
            return this.models().length;
        },
        at: function (index) {
            return this.models()[index];
        },
        next: function (idOrModel, startIndex) {
            var model = (typeof idOrModel === 'string') ? this.collection.get(idOrModel) : idOrModel,
                matched = this.models(),
                index = model ? _(matched).indexOf(model) : -1,
                length = matched.length;

            if (index === startIndex) return matched[startIndex];

            // if the array isn't empty and either none is selected, or the last is selected
            // we go to the first.
            // Under any other circumstance we select the current index + 1
            if (length > 0) {
                if (index === -1 || length === (index + 1) || length === 1) {
                    return matched[0];
                } else {
                    return matched[index + 1];
                }
            }
        },
        prev: function (idOrModel, startIndex) {
            var model = (typeof idOrModel === 'string') ? this.collection.get(idOrModel) : idOrModel,
                matched = this.models(),
                index = model ? _(matched).indexOf(model) : -1,
                length = matched.length;

            // if the array isn't empty and either none is selected, or the last is selected
            // we go to the first.
            // Under any other circumstance we select the current index + 1
            if (length > 0) {
                if (index === -1 || index === 0 || length === 1) {
                    return _(matched).last();
                } else {
                    return matched[index - 1];
                }
            }
        }
    });

    var methods = ['forEach', 'each', 'map', 'reduce', 'reduceRight', 'find',
        'detect', 'filter', 'select', 'reject', 'every', 'all', 'some', 'any',
        'include', 'contains', 'invoke', 'max', 'min', 'sortBy', 'sortedIndex',
        'toArray', 'size', 'first', 'initial', 'rest', 'last', 'without', 'indexOf',
        'shuffle', 'lastIndexOf', 'isEmpty', 'groupBy'];

    _.each(methods, function (method) {
        Capsule.SmartCollection.prototype[method] = function () {
            return _[method].apply(_, [this.models()].concat(_.toArray(arguments)));
        };
    });




    // Capsule.BindUtils
    // -----------------

    Capsule.BindUtils = {
        // ##Binding Utilities (thanks to [@natevw](http://andyet.net/team/nate/))
        // ###bindomatic
        // You send it your model, an event (or array of events) and options.
        // It will bind the event (or events) and set the proper context for the handler
        // so you don't have to bind the handler to the instance.
        // It also adds the function to an array of functions to unbind if the view is destroyed.
        bindomatic: function (model, ev, handler, options) {
            var opts = _(options || {}).defaults({
                    scope: this,
                    trigger: false
                }),
                boundHandler = _(handler).bind(opts.scope),
                evs = (ev instanceof Array) ? ev : [ev];
            _(evs).each(function (ev) {
                model.bind(ev, boundHandler);
            });
            if (opts && opts.trigger) boundHandler();
            (this._unbindomaticList = this._unbindomaticList || []).push(function () {
                _(evs).each(function (ev) {
                    model.unbind(ev, boundHandler);
                });
            });
        },

        // ###unbindomatic
        // Unbinds all the handlers in the unbindomatic list from the model.
        unbindomatic: function () {
            _(this._unbindomaticList || []).each(function (unbind) {
                unbind();
            });
        }
    };

    _.extend(Capsule.View.prototype, Capsule.BindUtils);
    _.extend(Capsule.Collection.prototype, Capsule.BindUtils);

})();
