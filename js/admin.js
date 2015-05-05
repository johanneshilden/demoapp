var sync = null;

var growl = function(msg, type) {
    if (!type)
        type = 'info';
    $.bootstrapGrowl(msg, { 
        type: type, // info, success, warning and danger
        ele: "body", 
        offset: {
            from: "top",
            amount: 70
        },
        align: "right", 
        width: 550,
        delay: 4000,
        allow_dismiss: true, 
        stackup_spacing: 10
    });
}
 
var BootstrapPager = React.createClass({
    getDefaultProps: function() {
        return {
            "maxPage": 0,
            "currentPage": 0,
        };
    },
    pageChange: function(event) {
        this.props.setPage(parseInt(event.target.getAttribute("data-value")));
    },
    render: function() {
        var firstClass = this.props.currentPage > 0 ? "" : "disabled",
            lastClass  = this.props.currentPage != (this.props.maxPage - 1) ? "" : "disabled";
        prev = 
            <li className={firstClass}>
                <a href="javascript:" onClick={this.props.previous} aria-label="Previous">
                    <span aria-hidden="true">&laquo;</span>
                </a>
            </li>
        next =
            <li className={lastClass}>
                <a href="javascript:" onClick={this.props.next} aria-label="Next">
                    <span aria-hidden="true">&raquo;</span>
                </a>
            </li>
        var options = [],
            startIndex = Math.max(this.props.currentPage - 5, 0),
            endIndex = Math.min(startIndex + 11, this.props.maxPage);

        if (this.props.maxPage >= 11 && (endIndex - startIndex) <= 10) {
            startIndex = endIndex - 11;
        }

        var current = this.props.currentPage;
        for(var i = startIndex; i < endIndex; i++){
            var selected = current == i ? "active" : "";
            options.push(<li className={selected}><a href="javascript:" data-value={i} onClick={this.pageChange}>{i + 1}</a></li>);
        }
        if (options.length <= 1)
            return null;
        return (
            <nav>
                <ul className="pagination">
                    {prev}
                    {options}
                    {next}
                </ul>
            </nav>
        );
    }
});

var TransactionsView = React.createClass({
    render: function() {
        return (
            <TransactionsTable />
        );
    }
});

var ObjectComponent = React.createClass({
    stringify: function(str) {
        return JSON.stringify(this.props.data, null, 2);
    },
    render: function() {
        return (
            <pre>{this.stringify()}</pre>
        );
    }
});

var TransactionsTable = React.createClass({
    loadTransactions: function() {
        sync({
            url: url + '/transactions',
            method: 'GET'
        }, this.onSuccess, this.onError);
    },
    onSuccess: function(resp) {
        console.log(resp);
        var data = [];
        _.each(resp, function(item) {
            data.push(item);
        });
        this.setState({data: data, loaded: true});
    },
    onError: function(e) {
        console.log(e);
        this.setState({loaded: true});
    },
    getInitialState: function() {
        return {data: [], loaded: false};
    },
    refresh: function() {
        this.setState({loaded: false});
        this.loadTransactions();
    },
    componentDidMount: function() {
        this.loadTransactions();
    },
    clearLog: function() {
        bootbox.confirm('Are you sure?', function(result) {
            if (result) {
                sync({
                    url: url + '/transactions/all',
                    method: 'DELETE'
                }, 
                this.onClearLogSuccess, this.onError);
                this.setState({loaded: false});
            }
        }.bind(this));
    },
    onClearLogSuccess: function() {
        this.setState({data: [], loaded: true});
    },
    render: function() {
        var metadata = [{
            "columnName": "timestamp",
            "order": 1,
            "locked": false,
            "visible": true,
            "displayName": "Timestamp"
        },
        {
            "columnName": "index",
            "order": 2,
            "locked": false,
            "visible": true,
            "displayName": "Index"
        },
        {
            "columnName": "range",
            "order": 3,
            "locked": false,
            "visible": true,
            "displayName": "Range",
            "customComponent": React.createClass({
                render: function() {
                    return (
                        <span>{JSON.stringify(this.props.data)}</span>
                    );
                }
            })
        },
        {
            "columnName": "up",
            "order": 4,
            "locked": false,
            "visible": true,
            "displayName": "Up",
            "customComponent": ObjectComponent
        },
        {
            "columnName": "down",
            "order": 5,
            "locked": false,
            "visible": true,
            "displayName": "Down",
            "customComponent": ObjectComponent
        }];
        return (
            <Loader color="#2c3e50" loaded={this.state.loaded}>
                <div className="panel panel-default">
                    <div className="panel-heading">
                        <button onClick={this.refresh} type="button" className="btn btn-default pull-right">
                            <span className="glyphicon glyphicon-refresh" aria-hidden="true"></span>
                        </button>
                        <button onClick={this.clearLog} type="button" className="btn btn-danger">Clear log</button>
                    </div>
                    <div className="panel-body">
                        <Griddle resultsPerPage={25} useGriddleStyles={false} tableClassName="table table-bordered" columns={["timestamp", "index", "range", "up", "down"]} columnMetadata={metadata} showFilter={true} useCustomPagerComponent="true" customPagerComponent={BootstrapPager} results={this.state.data} />
                    </div>
                </div>
            </Loader>
        );
    }
});

var TokensView = React.createClass({
    render: function() {
        return (
            <TokensTable />
        );
    }
});

var TokensTable = React.createClass({
    loadTokens: function() {
        sync({
            url: url + '/tokens',
            method: 'GET'
        }, this.onSuccess, this.onError);
    },
    onSuccess: function(resp) {
        var data = [];
        _.each(resp, function(item) {
            item.keyName = item.token;
            data.push(item);
        });
        this.setState({data: data, loaded: true});
    },
    onError: function(e) {
        console.log(e);
        this.setState({loaded: true});
    },
    getInitialState: function() {
        return { data: [], loaded: false };
    },
    refresh: function() {
        this.setState({loaded: false});
        this.loadTokens();
    },
    componentDidMount: function() {
        this.loadTokens();
    },
    removeToken: function(key, type) {
        bootbox.confirm('Are you sure?', function(result) {
            if (result) {
                sync({
                    url: url + '/tokens/' + type + '/' + key,
                    method: 'DELETE'
                }, function() {
                    var data = _.filter(this.state.data, function(item) {
                        return item.keyName != key;
                    });
                    this.setState({data: data, loaded: true});
                    growl("Token '" + key + "' was successfully revoked.");       

                }.bind(this), this.onError);
            }
        }.bind(this)); 
    },
    render: function() {
        var t = this;
        metadata = [{
            "columnName": "keyName",
            "order": 1,
            "locked": false,
            "visible": true,
            "displayName": "Key"
        }, 
        {
            "columnName": "secret",
            "order": 2,
            "locked": false,
            "visible": true,
            "displayName": "Secret"
        },
        {
            "columnName": "type",
            "order": 3,
            "locked": false,
            "visible": true,
            "displayName": "Type"
        },
        {
            "columnName": "revoke",
            "order": 4,
            "locked": true,
            "visible": true,
            "displayName": "",
            "customComponent": React.createClass({
                render: function() {
                    var key = this.props.rowData.keyName,
                        type = this.props.rowData.type;
                    return (
                        <a onClick={t.removeToken.bind(null, key, type)} href="javascript:">Revoke</a>
                    );
                }
            })
        }];
        return (
            <Loader color="#2c3e50" loaded={this.state.loaded}>
                <div className="panel panel-default">
                    <div className="panel-heading text-right">
                        <button onClick={this.refresh} type="button" className="btn btn-default">
                            <span className="glyphicon glyphicon-refresh" aria-hidden="true"></span>
                        </button>
                    </div>
                    <div className="panel-body">
                        <Griddle resultsPerPage={25} useGriddleStyles={false} tableClassName="table table-bordered" showFilter={true} columns={["keyName", "secret", "type", "revoke"]} columnMetadata={metadata} useCustomPagerComponent="true" customPagerComponent={BootstrapPager} results={this.state.data} />
                    </div>
                </div>
            </Loader>
        );
    }
});

var SignInForm = React.createClass({
    onSubmit: function() {
        window.sync = new OAuthSync({
            key: 'consumer_key',
            secret: 'consumer_secret', 
            endpoint: url,
            signatureMethod: 'PLAINTEXT'
        });
        $('#navbar-container').show();
        // Refresh the current route
        Backbone.history.stop(); 
        Backbone.history.start();
    },
    render: function() {
        return (
            <div>
                <div>
                    <h3 className="text-center">Please sign in</h3>
                    <div className="form-group">
                        <label htmlFor="host">Host</label>
                        <input type="text" ref="signinHost" className="form-control" placeholder="http://infinite-lake-1337.herokuapp.com" required autofocus />
                    </div>
                    <div className="form-group">
                        <label htmlFor="admin-key">Administrator key</label>
                        <input type="text" ref="signinKey"  className="form-control" placeholder="demo" required autofocus />
                    </div>
                    <div className="form-group">
                        <label htmlFor="admin-secret">Secret</label>
                        <input type="password" ref="signinSecret" className="form-control" placeholder="gh6jyg3X5ggsUnqxPKjYRPrajsNC4U4w" required />
                    </div>
                </div>
                <button onClick={this.onSubmit} className="btn btn-primary btn-block" type="submit">Sign in</button>
            </div>
        );
    }
});

var ConsumerForm = React.createClass({
    onSubmit: function() {
        if (this.isValid()) {
            var name = this.refs.consumerName.getDOMNode().value;
            sync({
                url: url + '/consumers',
                method: 'POST',
                data: {
                    payload: JSON.stringify({
                        name: name
                    }) 
                }
            }, 
            this.onSuccess.bind(null, name), 
            this.onError.bind(null, name));
            this.setState({loaded: false});
        }
    },
    onSuccess: function(name) {
        window.location.hash = 'consumers';
        growl("Consumer '" + name + "' was successfully created.");
        this.setState({loaded: true});
    },
    onError: function(name, e) {
        console.log(e);
        switch (e.status) {
            case 409:
                growl("Error: A consumer with the name '" + name + "' already exists.", 'danger');
                break;
            default:
                // @todo: e.responseText should be parsed to a JSON object
                alert(e.responseText);
        }
        this.setState({loaded: true});
    },
    isValid: function() {

        var errors = {},
            isValid = true;

        if (!this.refs.consumerName.getDOMNode().value) {
            errors['consumerName'] = 'This field is required.';
            isValid = false;
        }
        this.setState({errors: errors});

        return isValid;
    },
    getInitialState: function() {
        return {errors: {}, loaded: true};
    },
    render: function() {
        var nameErrorMsg = '',
            nameHasErrors = this.state.errors.consumerName;
        if (nameHasErrors) {
            nameErrorMsg = <span className="help-block">{this.state.errors.consumerName}</span>
        }
        return (
            <Loader color="#2c3e50" loaded={this.state.loaded}>
                <div className={$c('form-group', {'has-error': nameHasErrors})}>
                    <label htmlFor="name">Name</label>
                    <input type="text" ref="consumerName" className="form-control" required autofocus />
                    {nameErrorMsg}
                </div>
                <button type="submit" className="btn btn-default btn-block" onClick={this.onSubmit}>Submit</button>
            </Loader>
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

var ConsumersView = React.createClass({
    render: function() {
        return (
            <ConsumersTable />
        );
    }
});

var DeleteComponent = React.createClass({
    render: function() {
        var url = "#consumers/delete/" + this.props.rowData.id;
        return (
            <a href={url}>Delete</a>
        );
    }
});

var ViewComponent = React.createClass({
    render: function() {
        var url = "#consumers/show/" + this.props.rowData.id;
        return (
            <a href={url}>Show details</a>
        );
    }
});

var ConsumersTable = React.createClass({
    loadConsumers: function() {
        sync({
            url: url + '/consumers',
            method: 'GET'
        }, this.onSuccess, this.onError);
    },
    onSuccess: function(resp) {
        var consumers = [];
        for (var key in resp) {
            var obj  = resp[key];
            obj.name = key;
            consumers.push(obj);
        }
        this.setState({data: consumers, loaded: true});
    },
    onError: function(e) {
        console.log(e);
        this.setState({loaded: true});
    },
    getInitialState: function() {
        return { data: [], loaded: false };
    },
    refresh: function() {
        this.setState({loaded: false});
        this.loadConsumers();
    },
    componentDidMount: function() {
        this.loadConsumers();
    },
    redirectCreateNew: function() {
        window.location.hash = 'consumers/new';
    },
    removeConsumer: function(name) {
        bootbox.confirm('Are you sure?', function(result) {
            if (result) {
                sync({
                    url: url + '/consumers/' + name,
                    method: 'DELETE'
                }, function() {
                    var data = _.filter(this.state.data, function(item) {
                        return item.name != name;
                    });
                    this.setState({data: data, loaded: true});
                    growl("Consumer '" + name + "' was removed.");
       
                }.bind(this), this.onError);
            }
        }.bind(this)); 
    },
    render: function() {
        var t = this;
        var metadata = [{
            "columnName": "id",
            "order": 1,
            "locked": false,
            "visible": true,
            "displayName": "Id"
        },
        {
            "columnName": "name",
            "order": 2,
            "locked": false,
            "visible": true,
            "displayName": "Name"
        },
        {
            "columnName": "secret",
            "order": 3,
            "locked": false,
            "visible": true,
            "displayName": "Secret"
        },
        {
            "columnName": "delete",
            "order": 5,
            "locked": true,
            "visible": true,
            "customComponent": React.createClass({
                render: function() {
                    /* -------------------- TEMP ---------------------- */
                    if ('consumer_key' == this.props.rowData.name)
                        return (
                            <span></span>
                        );
                    /* -------------------- TEMP ---------------------- */
                    return (
                        <a onClick={t.removeConsumer.bind(null, this.props.rowData.name)} href="javascript:">Remove</a>
                    );
                }
            }),
            "displayName": ""
        },
        {
            "columnName": "show",
            "order": 4,
            "locked": true,
            "visible": true,
            "customComponent": ViewComponent,
            "displayName": ""
        }];
        return (
            <Loader color="#2c3e50" loaded={this.state.loaded}>
                <div className="panel panel-default">
                    <div className="panel-heading">
                        <button onClick={this.refresh} type="button" className="btn btn-default pull-right">
                            <span className="glyphicon glyphicon-refresh" aria-hidden="true"></span>
                        </button>
                        <button onClick={this.redirectCreateNew} type="button" className="btn btn-primary">New consumer</button>
                    </div>
                    <div className="panel-body">
                        <Griddle resultsPerPage={25} useGriddleStyles={false} tableClassName="table table-bordered" showFilter={true} columns={["id", "name", "secret", "delete"]} columnMetadata={metadata} useCustomPagerComponent="true" customPagerComponent={BootstrapPager} results={this.state.data} />
                    </div>
                </div>
            </Loader>
        );
    }
});

var url = 'http://infinite-lake-1337.herokuapp.com';
//var url = 'http://localhost:3333';

var Router = Backbone.Router.extend({
    routes: {
        ""                   : "index",
        "consumers/new"      : "createConsumer",
        "consumers"          : "listConsumers",
        "tokens"             : "listTokens",
        "transactions"       : "listTransactions",
        "signout"            : "signOut"
    },
    index: function() {

        if (sync) {
            window.location.hash = 'consumers';
            return;
        }

        $('#navbar-container').hide();

        React.render(
            <SignInForm />,
            document.getElementById('main')
        );
    },
    listConsumers: function() {

        if (!sync) {
            window.location.hash = '';
            return;
        }

        React.render(
            <ConsumersView />,
            document.getElementById('main')
        );
    },
    createConsumer: function() {

        if (!sync) {
            window.location.hash = '';
            return;
        }

        React.render(
            <ConsumerForm />,
            document.getElementById('main')
        );
    },
    listTokens: function() {

        if (!sync) {
            window.location.hash = '';
            return;
        }

        React.render(
            <TokensView />,
            document.getElementById('main')
        );
    },
    listTransactions: function() {

        if (!sync) {
            window.location.hash = '';
            return;
        }

        React.render(
            <TransactionsView />,
            document.getElementById('main')
        );
    },
    signOut: function() {
        sync = null;
        window.location.hash = '';
    }
});

var router = new Router();

Backbone.history.start();

