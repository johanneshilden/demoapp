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
 
var TaskForm = React.createClass({
    handleSubmit: function() {
        if (this.isValid()) {
            var obj = {
                description: this.state.description,
                created: Date.now()
            };
            api.command({
                method     : 'POST',
                resource   : 'tasks',
                payload    : obj
            }, true);

            growl('Task created.');

            this.refs.taskList.fetchTasks();
            this.setState({description: '', complete: true});
        }
    },
    isValid: function() {
        if (!this.state.description) {
            this.setState({complete: false});
            return false;
        }
        return true;
    },
    handleChange: function(event) {
        this.setState({description: event.target.value});
    },
    getInitialState: function() {
        return {description: '', complete: true};
    },
    render: function() {
        var descriptionError = '';
        if (false === this.state.complete) {
            descriptionError = <span className="help-block">You must enter a description of the task.</span>
        }
        return (
            <div>
                <div className="panel panel-default">
                    <div className="panel-body">
                        <div className={$c('form-group', {'has-error': (false === this.state.complete)})}>
                            <label htmlFor="task-description">Description</label>
                            <textarea id="task-description" className="form-control" rows="4" onChange={this.handleChange} value={this.state.description} />
                            {descriptionError}
                        </div>
                        <div className="form-group">
                            <button onClick={this.handleSubmit} type="button" className="btn btn-primary btn-block">Save</button>
                        </div>
                    </div>
                </div>
                <TaskList ref="taskList" />
            </div>
        );
    }
});

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

var NotificationList = React.createClass({
    explanation: function(error) {
        switch (error._error) {
            case 'MISSING_KEY':
                return 'The following resource was not found: ' + error.resource + '. It may have been removed by another user.';
            default:
                return error._error + ': ' + error.resource;
        }
    },
    dismiss: function() {
        $('#notifications').html('');
    },
    render: function() {
        var i = 1;
        var notices = this.props.messages.map(function(item) {
            return (
                <div key={i++} className="alert alert-warning" role="alert">
                    <strong>Conflict detected! </strong>{this.explanation(item)}
                </div>
            );
        }.bind(this));
        return (
            <div>
                {notices}
                <p className="text-right">
                    <a href="javascript:" onClick={this.dismiss}>Dismiss</a>
                </p>
            </div>
        );
    }
});
    
var TaskList = React.createClass({
    fetchTasks: function() {
        var tasks = [],
            data = [];
        try {
            tasks = JSON.parse(localStorage.getItem(namespace + 'tasks'));
        } catch(e) {
            console.log(e);
        }
        _.each(tasks, function(item) {
            if (item.hasOwnProperty('href')) {
                try {
                    var obj = JSON.parse(localStorage.getItem(namespace + item.href));
                    obj.key = obj['_links'].self.href.split('/')[1];
                    data.push(obj);
                } catch(e) {
                    console.log(e);
                }
            }
        });
        this.setState({data: data, loaded: true});
    },
    syncRemote: function() {
        this.setState({loaded: false});
        api.sync([4, 5], null, function(resp, e) {
            if (e.length) {
                React.render(
                    <NotificationList messages={e} />,
                    document.getElementById('notifications')
                );
            }
            this.fetchTasks();
        }.bind(this));
    },
    cancel: function() {
        this.setState({loaded: true});
    },
    getInitialState: function() {
        return {data: [], loaded: true};
    },
    componentDidMount: function() {
        this.fetchTasks();
    },
    closeTask: function(key) {

        api.command({
            method     : 'DELETE',
            resource   : 'tasks/' + key
        }, true);

        this.fetchTasks();

    },
    clearAll: function() {
        this.state.data.map(function (item) {
            api.command({
                method     : 'DELETE',
                resource   : 'tasks/' + item.key
            }, true);
        });
        this.fetchTasks();
    },
    render: function() {
        var tasks = this.state.data.map(function(item) {
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
        }.bind(this)).reverse();
        var contents = '';
        if (!this.state.data.length) {
            contents = 
                <div className="panel-body">
                    Nothing to do at the moment.
                </div>
        } else {
            contents = 
                <ul className="list-group">
                    {tasks}
                </ul>
        }
        var cancelBtn = '';
        if (!this.state.loaded) {
            cancelBtn = 
                <p className="text-right">
                    <a href="javascript:" onClick={this.cancel}>
                        Cancel
                    </a>
                </p>
        }
        return (
            <div>
                <Loader color="#2c3e50" loaded={this.state.loaded}>
                    <div className="panel panel-default">
                        <div className="panel-heading clearfix">
                            <div className="btn-group pull-right">
                                <button onClick={this.clearAll} type="button" className="btn btn-default btn-danger">
                                    <span className="glyphicon glyphicon-remove" aria-hidden="true"></span>&nbsp;Clear all
                                </button>
                                <button onClick={this.syncRemote} type="button" className="btn btn-default btn-primary">
                                    <span className="glyphicon glyphicon-cloud-download" aria-hidden="true"></span>&nbsp;Sync
                                </button>
                             </div>
                            <h3 className="panel-title">My tasks</h3>
                        </div>
                        {contents}
                    </div>
                </Loader>
                {cancelBtn}
            </div>
        );
    }
});

React.render(
    <TaskForm />,
    document.getElementById('main')
);

