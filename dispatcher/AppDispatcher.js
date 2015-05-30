var Dispatcher    = require('flux').Dispatcher;
var GlobalStore   = require('../store/GlobalStore');
var TaskStore     = require('../store/TaskStore');
var assign        = require('object-assign');

var AppDispatcher = assign(new Dispatcher, {});

function deviceIsOffline() {
    return (GlobalStore.offlineMode || !navigator.onLine);
}

AppDispatcher.register(function(payload) {
    switch (payload.actionType) {
        case 'offline-mode-status-change':
            GlobalStore.offlineMode = payload.value;
            GlobalStore.emitChange();
            break;
        case 'auto-sync-status-change':
            GlobalStore.autoSync = payload.value;
            GlobalStore.emitChange();
            break;
        case 'task-create':
            if (TaskStore.api.isBusy()) {
                GlobalStore.emitDeviceBusy();
            } else {
                TaskStore.saveTask(payload.formData);
            }
            break;
        case 'task-close':
            if (TaskStore.api.isBusy()) {
                GlobalStore.emitDeviceBusy();
            } else {
                TaskStore.closeTask(payload.taskKey);
            }
            break;
        case 'task-clear-all':
            if (TaskStore.api.isBusy()) {
                GlobalStore.emitDeviceBusy();
            } else {
                TaskStore.clearAll();
            }
            break;
        case 'sync-stack-change':
            if (GlobalStore.autoSync && !TaskStore.api.isBusy() && !deviceIsOffline()) {
                TaskStore.sync();
            } else {
                GlobalStore.syncChanges = true;
                GlobalStore.emitChange();
            }
            break;
        case 'sync':
            if (TaskStore.api.isBusy()) {
                GlobalStore.emitDeviceBusy();
            } else if (deviceIsOffline()) {
                GlobalStore.emitDeviceOffline();
            } else {
                TaskStore.sync();
            }
            break;
        default:
    }
    return true;
});

module.exports = AppDispatcher;
