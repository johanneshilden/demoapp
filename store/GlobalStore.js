var EventEmitter = require('events').EventEmitter;
var assign       = require('object-assign');

var GlobalStore = assign({}, EventEmitter.prototype, {

    emitChange: function() {
        this.emit('change');
    },

    addChangeListener: function(callback) {
        this.on('change', callback);
    },

    removeChangeListener: function(callback) {
        this.removeListener('change', callback);
    },

    emitDeviceOffline: function() {
        this.emit('device-offline');
    },

    addDeviceOfflineListener: function(callback) {
        this.on('device-offline', callback);
    },

    removeDeviceOfflineListener: function(callback) {
        this.removeListener('device-offline', callback);
    },

    emitDeviceBusy: function() {
        this.emit('device-busy');
    },

    addDeviceBusyListener: function(callback) {
        this.on('device-busy', callback);
    },

    removeDeviceBusyListener: function(callback) {
        this.removeListener('device-busy', callback);
    },

    autoSync      : false,
    offlineMode   : false,
    requestStatus : false,
    busyStatus    : false,
    syncChanges   : false

});

module.exports = GlobalStore;
