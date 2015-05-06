var growl = function(msg, type) {
    if (!type)
        type = 'info';
    $.bootstrapGrowl(msg, { 
        type: type, // info, success, warning and danger
        ele: "body", 
        offset: {
            from: "top",
            amount: 30
        },
        align: "right", 
        width: 340,
        delay: 4000,
        allow_dismiss: true, 
        stackup_spacing: 10
    });
}
 
function $c(staticClassName, conditionalClassNames) {
    var classNames = []
    if (typeof conditionalClassNames == 'undefined') {
        conditionalClassNames = staticClassName
    } else {
        classNames.push(staticClassName)
    }
    for (var className in conditionalClassNames) {
        if (!!conditionalClassNames[className]) {
            classNames.push(className)
        }
    }
    return classNames.join(' ');
}

var Notifications = React.createClass({
    explain: function(error) {
        switch (error._error) {
            case 'MISSING_KEY':
                return 'The following resource was not found: ' + error.resource + '. It has either been removed from the local device or deleted by multiple user simultaneously.';
            default:
                return error._error + ': ' + error.resource;
        }
    },
    showMsgs: function(items) {
        if (items) {
            this.setState({data: items});
        }
    },
    getInitialState: function() {
        return {data: []};
    },
    closeAlert: function(item) {
        var data = this.state.data;
        data.splice(item, 1);
        this.setState({data: data});
    },
    render: function() {
        var i = 1;
        return (
            <div>
                {this.state.data.map(function(item) {
                    return (
                        <div key={i++} className="alert alert-warning" role="alert">
                            <button onClick={this.closeAlert.bind(null, i - 2)} type="button" className="close"><span aria-hidden="true">&times;</span></button>
                            <strong>Conflict detected! </strong>{this.explain(item)}
                        </div>
                    );
                }.bind(this))}
            </div>
        );
    }
});

var StatusIcons = React.createClass({
    setUpdatesStatus: function(updates) {
        this.setState({hasUpdates: updates});
    },
    getInitialState: function() {
        return {online: false, hasUpdates: false};
    },
    timeout: function() {
        setTimeout(function() {

            var url = 'http://infinite-lake-1337.herokuapp.com';
            //var url = 'http://localhost:3333';

            if (navigator)
                this.setState({online: navigator.onLine});

            engine({
                url: url + '/syncpoint/' + _id,
                method: 'GET'
            }, function(resp) {
                if (resp.hasOwnProperty('body') && resp.body.hasOwnProperty('syncPoint')) {
                    try {
                        var sp = JSON.parse(localStorage.getItem(namespace + '_syncPoint'));
                        this.setState({hasUpdates: (sp != resp.body.syncPoint)});
                    } catch(e) {
                    }
                }
            }.bind(this));

            this.timeout();
        }.bind(this), 2000);
    },
    componentDidMount: function() {
        this.timeout();
    },
    componentDidUpdate: function() {
        $(function () {
            $('[data-toggle="tooltip"]').tooltip()
        });
    },
    render: function() {
        return (
            <div className="status-icons">
                {this.state.online ? <button data-toggle="tooltip" data-placement="bottom" title="Device is connected"><span className="glyphicon glyphicon-flash"></span></button> : ''}
                {this.state.hasUpdates ? <button data-toggle="tooltip" data-placement="bottom" title="Updates are available remotely"><span className="glyphicon glyphicon-bell"></span></button> : ''}
            </div>
        );
    }
});

var TaskForm = React.createClass({
    handleSubmit: function() {
        if (this.isValid()) {
            var obj = {
                description: this.state.description,
                created: Date.now()
            };
            var resp = api.command({
                method: 'POST',
                resource: 'tasks',
                payload: obj
            }, true);

            if (!resp._error) {
                growl('Task created.');
                this.props.refreshHandler();
                this.setState({description: '', complete: true});
            }
        }
    },
    handleChange: function(event) {
        this.setState({description: event.target.value});
    },
    getInitialState: function() {
        return {description: '', complete: true};
    },
    isValid: function() {
        if (!this.state.description) {
            this.setState({complete: false});
            return false;
        }
        return true;
    },
    render: function() {
        return (
            <div className="panel panel-default">
                <div className="panel-body">
                    <div className={$c('form-group', {'has-error': (false === this.state.complete)})}>
                        <label htmlFor="task-description">Description</label>
                        <textarea id="task-description" className="form-control" rows="4" onChange={this.handleChange} value={this.state.description} />
                        {false === this.state.complete ? <span className="help-block">You must enter a description of the task.</span> : ''}
                    </div>
                    <div className="form-group">
                        <button onClick={this.handleSubmit} type="button" className="btn btn-primary btn-block">Save</button>
                    </div>
                </div>
            </div>
        );
    }
});

var TaskList = React.createClass({
    fetchTasks: function() {
        var tasks = [], data = [];
        try {
            tasks = JSON.parse(localStorage.getItem(namespace + 'tasks'));
        } catch(e) {
            console.log(e);
        }
        _.each(tasks, function(item) {
            if (item.hasOwnProperty('href')) {
                try {
                    var obj = JSON.parse(localStorage.getItem(namespace + item.href));
                    obj.key = obj['_links']['self']['href'].split('/')[1];
                    data.push(obj);
                } catch(e) {
                    console.log(e);
                }
            }
        });
        this.setState({data: data, loaded: true});
    },
    sync: function() {
        this.setState({loaded: false});
        api.sync([4, 5], null, function(resp, e) {
            this.props.notificationHandler(e || []);
            this.props.statusUpdatesHandler(false);
            this.fetchTasks();
        }.bind(this));
    },
    cancelSync: function() {

        // @todo

        this.setState({loaded: true});
    },
    closeTask: function(key) {
        api.command({
            method: 'DELETE',
            resource: 'tasks/' + key
        }, true);
        this.fetchTasks();
    },
    clearAll: function() {
        this.state.data.map(function (item) {
            api.command({
                method: 'DELETE',
                resource: 'tasks/' + item.key
            }, true);
        });
        this.fetchTasks();
    },
    getInitialState: function() {
        return {data: [], loaded: true};
    },
    componentDidMount: function() {
        this.fetchTasks();
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
                {this.state.data.map(function(item) {
                    var timeago = $.timeago(item.created);
                    return (
                        <li key={item.key} className="list-group-item clearfix">
                            <button onClick={this.closeTask.bind(null, item.key)} type="button" className="btn btn-default btn-sm pull-right">
                                <span className="glyphicon glyphicon-ok" aria-hidden="true"></span>
                                &nbsp;&nbsp;Close task
                            </button>
                            {item.description}&nbsp;<small style={{color: '#787878'}}><br />(Created {timeago})</small>
                        </li>
                    );
                }.bind(this))}
            </ul>
        );
    },
    render: function() {
        return (
            <div>
                <Loader color="#2c3e50" loaded={this.state.loaded}>
                    <div className="panel panel-default">
                        <div className="panel-heading clearfix">
                            <div className="btn-group pull-right">
                                <button onClick={this.clearAll} type="button" className="btn btn-default btn-danger">
                                    <span className="glyphicon glyphicon-remove" aria-hidden="true"></span>&nbsp;Clear all
                                </button>
                                <button onClick={this.sync} type="button" className="btn btn-default btn-primary">
                                    <span className="glyphicon glyphicon-cloud-download" aria-hidden="true"></span>&nbsp;Sync
                                </button>
                            </div>
                            <h3 className="panel-title">My tasks</h3>
                        </div>
                        {this.state.data.length ? this.tasks() : this.emptyMsg()}
                    </div>
                </Loader>
                {this.state.loaded ? '' : <button onClick={this.cancelSync} type="button" className="btn btn-default btn-sm btn-block">Cancel</button>} 
            </div>
        );
    }
});

var TaskComponent = React.createClass({
    refresh: function() {
        this.refs.taskList.fetchTasks();
    },
    showNotifications: function(msgs) {
        this.refs.notifications.showMsgs(msgs);
    },
    setUpdatesStatus: function(updates) {
        this.refs.statusIcons.setUpdatesStatus(updates);
    },
    render: function() {
        return (
            <div>
                <StatusIcons ref="statusIcons" />
                <h4>{this.props.name}</h4>
                <hr />
                <Notifications ref="notifications" />
                <TaskForm refreshHandler={this.refresh} />
                <TaskList notificationHandler={this.showNotifications} statusUpdatesHandler={this.setUpdatesStatus} ref="taskList" />
            </div>
        );
    }
});

React.render(
    <TaskComponent name={name} />,
    document.getElementById('main')
);

