var $                     = require('jquery');
var AppDispatcher         = require('../dispatcher/AppDispatcher');
var GlobalStore           = require('../store/GlobalStore');
var GroundFork            = require('./groundfork');
var React                 = require('react');
var ReconnectingWebSocket = require('awesome-websocket').ReconnectingWebSocket;
var TaskComponent         = require('../component/TaskComponent');
var TaskStore             = require('../store/TaskStore');

var store = new GroundFork.BrowserStorage({
    namespace: window.ns 
});

var api = new GroundFork.Api({
    storage: store,
//    debugMode: true,
//    interval: 400,  // temp
    onBatchJobStart: function() {
        GlobalStore.busyStatus = true;
        GlobalStore.emitChange();
    },
    onBatchJobComplete: function() {
        GlobalStore.busyStatus = false;
        GlobalStore.syncChanges = false;
        GlobalStore.emitChange();
    }
});

var endpoint = new GroundFork.BasicHttpEndpoint({
    api: api,
    url: 'http://infinite-sands-4413.herokuapp.com/',
    clientKey: window.consumerKey,
    clientSecret: window.consumerSecret,
    onRequestStart: function() {
        GlobalStore.requestStatus = true;
        GlobalStore.emitChange();
    },
    onRequestComplete: function() {
        GlobalStore.requestStatus = false;
        GlobalStore.emitChange();
    }
});

TaskStore.api = api;
TaskStore.storage = store;
TaskStore.endpoint = endpoint;

var socket = new ReconnectingWebSocket("ws://infinite-sands-4413.herokuapp.com");

socket.onopen = function(event) {
    console.log('ReconnectingWebSocket connection opened.');
    socket.send(JSON.stringify({node: window.consumerKey}));
};

socket.onclose = function(event) {
    console.log('ReconnectingWebSocket connection closed.');
};

socket.onerror = function(e) {
//    console.log(e);
};

socket.onmessage = function(event) {
    AppDispatcher.dispatch({
        actionType: 'sync-stack-change'
    });
};

React.render(
    <TaskComponent />,
    document.getElementById('main')
);
