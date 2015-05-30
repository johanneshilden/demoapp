var React     = require('react');
var StatusBar = require('../component/StatusBar');
var TaskList  = require('../component/TaskList');
var TaskForm  = require('../component/TaskForm');

var TaskComponent = React.createClass({
    render: function() {
        return (
            <div>
                <StatusBar />
                <hr />
                <h4>{window.name}</h4>
                <TaskForm name={window.name} />
                <TaskList />
            </div>
        );
    }
});

module.exports = TaskComponent;
