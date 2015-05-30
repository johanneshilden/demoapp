var AppDispatcher = require('../dispatcher/AppDispatcher');
var GlobalStore   = require('../store/GlobalStore');
var React         = require('react');
var TaskStore     = require('../store/TaskStore');
var TimeAgo       = require('react-timeago');
var Loader        = require('react-loader');

var TaskList = React.createClass({
    refresh: function() {
        this.setState({tasks: TaskStore.getTasks()});
    },
    clearAll: function() {
        AppDispatcher.dispatch({
            actionType: 'task-clear-all'
        });
    },
    closeTask: function(key) {
        AppDispatcher.dispatch({
            actionType: 'task-close',
            taskKey: key 
        });
    },
    sync: function() {
        AppDispatcher.dispatch({
            actionType: 'sync'
        });
    },
    getInitialState: function() {
        return {
            tasks: [],
            loaded: true
        };
    },
    componentDidMount: function() {
        TaskStore.addChangeListener(this.refresh);
        GlobalStore.addChangeListener(function() {
            this.setState({
                loaded: !GlobalStore.requestStatus
            });
        }.bind(this));
    },
    renderButtons: function() {
        return (
            <div className="btn-group pull-right">
                <button 
                    onClick={this.clearAll}
                    type="button" 
                    className="btn btn-default btn-danger">
                    <span className="glyphicon glyphicon-remove" aria-hidden="true"></span>&nbsp;Clear all
                </button>
                <button 
                    onClick={this.sync} 
                    type="button" 
                    className="btn btn-default btn-primary">
                    <span className="glyphicon glyphicon-cloud-download" aria-hidden="true"></span>&nbsp;Sync
                </button>
            </div>
        );
    },
    timeFormatter: function(value, unit, suffix) {
        if ('second' == unit) {
            return 'less than a minute ago';
        }
        if (value !== 1) {
            unit += 's';
        }
        return value + ' ' + unit + ' ' + suffix;
    },
    emptyMsg: function() {
        return (
            <div className="panel-body">
                Nothing to do at the moment.
            </div>
        );
    },
    tasks: function() {
        return (
            <ul className="list-group">
                {this.state.tasks.map(function(task) {
                    return (
                        <li key={task.key} className="list-group-item clearfix">
                            <button 
                                onClick={this.closeTask.bind(null, task.key)}
                                type="button"
                                className="btn btn-default btn-sm pull-right">
                                <span className="glyphicon glyphicon-ok" aria-hidden="true"></span>
                                &nbsp;&nbsp;Close task
                            </button>
                            {task.description}
                            <small style={{color: '#787878'}}>
                                <br />Created by <b>{task.author}</b> 
                                &nbsp;<TimeAgo 
                                    date={task.created} 
                                    formatter={this.timeFormatter} />
                            </small>
                        </li>
                    );
                }.bind(this))}
            </ul>
        );
    },
    render: function() {
        return (
            <Loader color="#2c3e50" loaded={this.state.loaded}>
                <div className="panel panel-default">
                    <div className="panel-heading clearfix">
                        {this.renderButtons()}
                        <h3 className="panel-title">My tasks</h3>
                    </div>
                    {this.state.tasks.length ? this.tasks() : this.emptyMsg()}
               </div>
            </Loader>
        );
    }
});

module.exports = TaskList;
