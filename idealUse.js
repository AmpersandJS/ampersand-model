var Task = require('models/task'),
    Tasks = require('models/tasks'),
    Messages = require('models/messages'),
    _ = require('underscore'),
    StrictModel = require('strictModel').Model;


module.exports = StrictModel.extend({
    // we only want to get shipped once, because we'll hang on to them once we have
    // them in memory
    init: function () {
        this.getShippedTasks = _.once(this.getShippedTasks);
    },
    // every strict model needs a type
    type: 'member',
    // main properties as available via API
    props: {
        id: ['string', true],
        firstName: ['string', true],
        lastName: ['string', true],
        created: ['date'],
        email: ['string', true],
        username: ['string', true],
        lastLogin: ['date'],
        activeTask: 'string',
        statusMessage: 'string',
        didTutorial: 'boolean',
        muted: 'boolean',
        textSize: ['string', true, 'medium'],
        presence: ['string', true, 'offline'],
        unread: ['boolean', true, false],
        me: ['boolean', true, false],
        lastInteraction: ['date', true, '0'],
        pinned: ['boolean', true, false],
        smallPicUrl: ['string'],
        largePicUrl: ['string']
    },
    // derived properties and their dependencies. If any dependency changes
    // that will also trigger a 'change' event on the derived property so
    // we know to re-render the template
    derived: {
        team: {
            fn: function () {
                return this.collection.parent;
            }
        },
        fullName: {
            deps: ['firstName', 'lastName'],
            fn: function () {
                return this.firstName + ' ' + this.lastName;
            }
        },
        initials: {
            deps: ['firstName', 'lastName'],
            fn: function () {
                if (!this.firstName) return;
                return (this.firstName.charAt(0) + this.lastName.charAt(0)).toUpperCase();
            }
        },
        activeTaskTitle: {
            deps: ['activeTask'],
            fn: function () {
                var task = app.getModel('task', this.activeTask, this.team.id);
                return task ? task.taskTitleHtml : '';
            }
        },
        url: {
            deps: ['username'],
            fn: function () {
                return this.team.id ? this.team.url + '/' + (this.me ? 'me' : this.username) : '';
            }
        },
        tasksUrl: {
            deps: ['username'],
            fn: function () {
                return this.url + '/tasks';
            }
        },
        lateredUrl: {
            deps: ['username'],
            fn: function () {
                return this.url + '/latered';
            }
        },
        shippedUrl: {
            deps: ['username'],
            fn: function () {
                return this.url + '/shipped';
            }
        },
        chatUrl: {
            deps: ['username'],
            fn: function () {
                return this.url + '/chat';
            }
        },
        atName: {
            deps: ['username'],
            fn: function () {
                return "@" + this.username;
            }
        }
    },
    // session variables are browser state for a model
    // these trigger 'change' events when set, but are not
    // included when serializing or saving to server
    session: {
        tasks: ['array', true, []],
        latered: ['array', true, []],
        shipped: ['array', true, []],
        lastPage: ['string', true, 'tasks'],
        unread: ['boolean', true, false],
        active: ['boolean', true, false],
        // used to cache a chat message that you're writing
        // lets you switch pages and come back without losing it
        unsentChatText: ['string', true, ''],
        order: ['number', false, 0]
    },
    // child collections that will be initted. They will
    // be created at as a property of the same name as the
    // key. The child collection will also be given a reference
    // to its parent.
    collections: {
        messages: Messages
    },
    getMemberTasks: function (cb) {
        return;
    },
    getShippedTasks: function (cb) {
        this.team.tasks.fetchShippedTasks(this.id);
    },
    getLateredTasks: function (cb) {
        return;
    },
    hasTask: function (idOrTask, opts) {
        var id = typeof idOrTask === 'string' ? idOrTask : idOrTask.id,
            defaults = _.defaults(opts, {listNames: ['tasks']}),
            tasks = [];
        _.each(defaults.listNames, function (listName) {
            tasks = tasks.concat(this.get(listName));
        }, this);
        return _(tasks).contains(id);
    },
    update: function (attrs) {
        if (!this.me) return;
    },
    resetLastInteraction: function () {
        app.api.resetLastInteraction(this.team.id, this.id);
    }
});
