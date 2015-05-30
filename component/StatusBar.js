var AppDispatcher = require('../dispatcher/AppDispatcher');
var GlobalStore   = require('../store/GlobalStore');
var React         = require('react');

var StatusBar = React.createClass({
    handleOfflineModeStatusChange: function(event) {
        var newStatus = event.target.checked;
        AppDispatcher.dispatch({
            actionType: 'offline-mode-status-change',
            value: newStatus
        });
    },
    handleAutoSyncStatusChange: function(event) {
        var newStatus = event.target.checked;
        AppDispatcher.dispatch({
            actionType: 'auto-sync-status-change',
            value: newStatus
        });
    },
    refresh: function() {
        this.setState({
            offlineMode   : GlobalStore.offlineMode,
            autoSync      : GlobalStore.autoSync,
            requestStatus : GlobalStore.requestStatus,
            busyStatus    : GlobalStore.busyStatus,
            syncChanges   : GlobalStore.syncChanges
        });
    },
    getInitialState: function() {
        return {
            offlineMode   : false,
            autoSync      : false,
            deviceOnline  : navigator.onLine,
            requestStatus : GlobalStore.requestStatus,
            busyStatus    : GlobalStore.busyStatus,
            syncChanges   : GlobalStore.syncChanges
        };
    },
    updateOnlineStatus: function() {
        this.setState({
            deviceOnline: navigator.onLine
        });
    },
    componentDidMount: function() {
        GlobalStore.addChangeListener(this.refresh);
        window.addEventListener('online',  this.updateOnlineStatus);
        window.addEventListener('offline', this.updateOnlineStatus);
    },
    isOnline: function() {
        return (this.state.deviceOnline && !this.state.offlineMode);
    },
    render: function() {
        return (
            <div>
                <div className="status-icons">
                    {this.isOnline() ? <button data-toggle="tooltip" data-placement="bottom" title="Device is connected"><span className="glyphicon glyphicon-flash"></span></button> : ''}
                    {this.state.syncChanges && this.isOnline() ? <button data-toggle="tooltip" data-placement="bottom" title="Remote updates are available"><span className="glyphicon glyphicon-bell"></span></button> : ''}
                    {this.state.busyStatus ? <button><span className="glyphicon glyphicon-refresh glyphicon-spin"></span></button> : ''}
                </div>
                <div className="checkbox noselect">
                    <label className="checkbox-inline">
                        <input 
                            onChange={this.handleOfflineModeStatusChange} 
                            checked={this.state.offlineMode} 
                            type="checkbox" /> 
                        Offline mode
                    </label>
                    <label className="checkbox-inline">
                        <input 
                            onChange={this.handleAutoSyncStatusChange} 
                            checked={this.state.autoSync} 
                            type="checkbox" /> 
                        Auto-sync
                    </label>
                </div>
           </div>
        );
    }
});

module.exports = StatusBar;
