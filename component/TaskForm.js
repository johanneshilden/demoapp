var Alert         = require('react-bootstrap').Alert;
var AppDispatcher = require('../dispatcher/AppDispatcher');
var Button        = require('react-bootstrap').Button;
var GlobalStore   = require('../store/GlobalStore');
var Modal         = require('react-bootstrap').Modal;
var OverlayMixin  = require('react-bootstrap').OverlayMixin;
var React         = require('react');
var TaskStore     = require('../store/TaskStore');
var Addons        = require('react/addons');

var ReactCSSTransitionGroup = Addons.addons.CSSTransitionGroup;

var TaskForm = React.createClass({
    mixins: [OverlayMixin],
    getInitialState: function() {
        return {
            description: '',
            modalOpen: false,
            alertVisible: false,
            errors: {}
        };
    },
    handleChange: function(event) {
        var newState = {
            description: event.target.value
        };
        if (newState.description && this.state.errors['description']) {
            newState.errors = [];
        }
        this.setState(newState);
    },
    showDialog: function(message) {
        this.setState({
            modalOpen: true,
            modalMessage: message
        });
    },
    hasErrors: function() {
        var errors = {};
        if (!this.state.description) {
            errors['description'] = 'You must enter a description of the task.';
        }
        this.setState({errors: errors});
        return !!Object.keys(errors).length;
    },
    handleSubmit: function() {
        if (!this.hasErrors()) {
            if (TaskStore.api.isBusy()) {
                this.showDialog('The device is busy.');
                return;
            }
            AppDispatcher.dispatch({
                actionType: 'task-create',
                formData: {
                    description: this.state.description,
                    created: Date.now(),
                    author: this.props.name
                }
            });
        }
    },
    onTaskSaved: function() {
        this.setState({
            description: '',
            alertVisible: true
        });
    },
    handleToggle: function() {
        this.setState({
            modalOpen: !this.state.modalOpen
        });
    },
    componentDidMount: function() {
        TaskStore.addTaskSavedListener(this.onTaskSaved);
        TaskStore.addSyncFailedListener(function() {
            this.showDialog('Connection failed.');
        }.bind(this));
        GlobalStore.addDeviceOfflineListener(this.showDialog.bind(this, 
            'The device is offline.'));
        GlobalStore.addDeviceBusyListener(this.showDialog.bind(this, 
            'The device is busy.'));
    },
    renderOverlay: function() {
        if (!this.state.modalOpen) {
            return <span/>;
        }
        return (
            <Modal title="Notice" onRequestHide={this.handleToggle}>
                <div className="modal-body">
                    {this.state.modalMessage}
                </div>
                <div className="modal-footer">
                    <Button onClick={this.handleToggle}>Close</Button>
                </div>
            </Modal>
        );
    },
    handleAlertDismiss: function() {
        this.setState({alertVisible: false});
    },
    render: function() {
        var alert = '';
        if (this.state.alertVisible) {
            alert = 
                <div className="growl-alert" key="1">
                    <Alert bsStyle="success" onDismiss={this.handleAlertDismiss} dismissAfter={2500}>
                        <p>Task saved.</p>
                    </Alert>
                </div>
        }
        return (
            <div>
                <ReactCSSTransitionGroup transitionName="fade">
                    {alert}
                </ReactCSSTransitionGroup>
                <div className="panel panel-default">
                    <div className="panel-body">
                        <div className={!!this.state.errors['description'] ? 'form-group has-error' : 'form-group'}>
                            <label htmlFor="task-description">
                                Description
                            </label>
                            <textarea 
                                id="task-description" 
                                className="form-control"
                                rows="4" 
                                onChange={this.handleChange} 
                                value={this.state.description} />
                            {this.state.errors['description'] ? <span className="help-block">You must enter a description of the task.</span> : ''}
                        </div>
                        <div className="form-group">
                            <button
                                type="button" 
                                className="btn btn-primary btn-block"
                                onClick={this.handleSubmit}>
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
});

module.exports = TaskForm;
