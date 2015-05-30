var EventEmitter = require('events').EventEmitter;
var GlobalStore  = require('../store/GlobalStore');
var assign       = require('object-assign');

var TaskStore = assign({}, EventEmitter.prototype, {

    emitChange: function() {
        this.emit('change');
    },

    addChangeListener: function(callback) {
        this.on('change', callback);
    },

    removeChangeListener: function(callback) {
        this.removeListener('change', callback);
    },

    emitTaskSaved: function() {
        this.emit('task-saved');
    },

    addTaskSavedListener: function(callback) {
        this.on('task-saved', callback);
    },

    removeTaskSavedListener: function(callback) {
        this.removeListener('task-saved', callback);
    },

    emitSyncFailed: function() {
        this.emit('sync-failed');
    },

    addSyncFailedListener: function(callback) {
        this.on('sync-failed', callback);
    },

    removeSyncFailedListener: function(callback) {
        this.removeListener('sync-failed', callback);
    },

    shouldAutoSync: function() {
        return GlobalStore.autoSync && !this.api.isBusy() && !(GlobalStore.offlineMode || !navigator.onLine);
    },

    saveTask: function(task) {
        var response = this.api.command({
            method: 'POST',
            resource: 'tasks',
            payload: task
        });
        if ('success' == response.status) {
            if (this.shouldAutoSync()) {
                this.sync();
            } else {
                this.emitChange();
            }
            this.emitTaskSaved();
        }
    },

    closeTask: function(key) {
        this.api.command({
            method: 'DELETE',
            resource: 'tasks/' + key
        });
        if (this.shouldAutoSync()) {
            this.sync();
        } else {
            this.emitChange();
        }
    },

    clearAll: function() {
        var tasks = this.getTasks();
        for (var key in tasks) {
            var task = tasks[key];
            this.api.command({
                method: 'DELETE',
                resource: 'tasks/' + task.key
            });
        }
        if (this.shouldAutoSync()) {
            this.sync();
        } else {
            this.emitChange();
        }
    },

    getTasks: function() {
        var data = [],
            tasks = this.storage.getItem('tasks');
        if (tasks && tasks.hasOwnProperty('_embedded') && tasks['_embedded'].hasOwnProperty('tasks')) {
            var collection = tasks['_embedded'].tasks;
            for (var key in collection) {
                var item = collection[key],
                    href = item['_links']['self'].href, 
                    obj = null;
                if (href && (obj = this.storage.getItem(href))) {
                    obj.key = href.split('/')[1];
                    data.push(obj);
                }
            }
        }
        return data;
    },

    onSyncSuccess: function() {
        this.emitChange();
    },

    onSyncError: function(e) {
        this.emitSyncFailed();
    },

    sync: function() {
        this.endpoint.sync(['alice', 'bob', 'sink'], 
            this.onSyncSuccess.bind(this),
            this.onSyncError.bind(this));
    }

});

module.exports = TaskStore;
