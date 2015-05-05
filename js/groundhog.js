"use strict";
var Endpoint = (function(){
    return function(config) {

        var patternMap = {},
            log        = [],
            syncPoint  = 0,
            messages   = [],
            namespace  = '',
            syncEngine = null,
            debugMode  = false;

        var storage = {

            updateCollectionWith: function(key, updater) {
                var nsKey = namespace + key,
                    cached = localStorage.getItem(nsKey),
                    collection = [];

                if (cached) {
                    try {
                        collection = JSON.parse(cached);
                    } catch (e) {
                        console.log(e);
                    }
                }

                localStorage.setItem(nsKey, JSON.stringify(updater(collection)));
            },

            /* Embed resources that appear under the _links property, when 
             * available locally. */
            expandLinks: function(item) {
                if ('object' === typeof item) {
                    if (item.hasOwnProperty('_links')) {
                        for (var key in item['_links']) {
                            if ('self' == key)
                                continue;
                            var href = item['_links'][key].href,
                                data = null;
                            try {
                                data = JSON.parse(localStorage.getItem(namespace + href));
                            } catch (e) {
                                console.log(e);
                            }
                            if (data) {
                                if (!item.hasOwnProperty('_embedded'))
                                    item['_embedded'] = {};
                                item['_embedded'][key] = data;
                            }
                        }
                    }
                } 
            },

            /* Insert an item into the current storage namespace under the 
             * provided key. */
            insertItem: function(key, value, expand) {
                if (true == expand) {
                    this.expandLinks(value);
                } 
                localStorage.setItem(namespace + key, JSON.stringify(value));
            },

            /* Add an item to a collection. */
            addToCollection: function(key, value) {
                this.updateCollectionWith(key, function(collection) {
                    collection.push(value);
                    return collection;
                });
            },

            /* Remove an item from a collection. */
            removeFromCollection: function(key, predicate) {
                this.updateCollectionWith(key, function(collection) {
                    return _.filter(collection, function(item) {
                        return !predicate(item);
                    });
                });
            },

            /* Retrieve the item matching the given key in the current namespace. */
            getItem: function(key) {
                var obj = null;
                try {
                    obj = JSON.parse(localStorage.getItem(namespace + key));
                } catch (e) {
                    console.log(e);
                }
                return obj;
            },

            /* Remove the item with the given key in the current namespace. */
            removeItem: function(key) {
                localStorage.removeItem(namespace + key);
            },

            /* Determine whether the current namespace has a key matching 
             * the provided name. */
            hasItem: function(key) {
                return (null !== localStorage.getItem(namespace + key));
            }

        };

        function setSelfURI(obj, uri) {
            if (!obj.hasOwnProperty('_links'))
                obj['_links'] = {};
            if (!obj['_links'].hasOwnProperty('self'))
                obj['_links']['self'] = {};
            if (!obj['_links']['self'].hasOwnProperty('href'))
                obj['_links']['self']['href'] = uri;
        }

        function getSelfURI(obj) {
            if (!obj.hasOwnProperty('_links') || !obj['_links'].hasOwnProperty('self'))
                return null;
            return obj['_links']['self']['href'];
        }

        function updateRefs(item) {
            if ('object' === typeof item) {
                for (var key in item) {
                    if ('href' == key) {
                        item[key] = Endpoint.r(item[key]);
                    } else {
                        updateRefs(item[key]);
                    }
                }
            } 
        }

        function route(forward, request, decorate) {
            for (var key in patternMap) {

                var index = log.length + 1,
                    route = patternMap[key],
                    resource = request.resource.replace(/\|\|/g, ''), 
                    context = route.pattern.match(request.method + '.' + resource);

                if (context) {

                    console.log('[ ' + request.method + '.' + resource + ' ]');

                    if (true == forward) {

                        if ('POST' == request.method) {
                            setSelfURI(request.payload, resource + '/' + index);
                            request.payload._local = !!decorate;
                        }

                        if ('POST' != request.method && decorate) 
                            request.resource = Endpoint.r(request.resource);
                        if ('PUT' == request.method) 
                            setSelfURI(request.payload, resource);
                    }

                    // Run the route action 
                    var method = route.method.bind(storage),
                        resp = method(context, request);

                    if (resp._error) {
                        console.log('Action failed: ' + resp._error + ' (' + resp.resource + ')');
                        resp.request = request;
                        return resp;
                    }

                    if (true == forward) {

                        var item;

                        switch (request.method) {

                            case 'POST':

                                item = {
                                    "up": {
                                        "method"   : "POST",
                                        "resource" : request.resource,
                                        "payload"  : request.payload
                                    },
                                    "down": {
                                        "method"   : "DELETE",
                                        "resource" : getSelfURI(request.payload)
                                    }
                                };

                                if (resp)
                                    item.down = resp;
                                if (decorate) 
                                    item.down.resource = Endpoint.r(item.down.resource);

                                break;

                            case 'DELETE':
                            case 'PATCH':
                            case 'PUT':

                                if ('DELETE' == request.method)
                                    setSelfURI(resp.payload, request.resource.replace(/\|\|/g, ''));

                                item = {
                                    "up": {
                                        "method"   : request.method,
                                        "resource" : request.resource
                                    },
                                    "down": resp
                                };

                                if ('PATCH' == request.method || 'PUT' == request.method)
                                    item.up.payload = request.payload;

                                if ('PUT' == request.method) 
                                    setSelfURI(item.down.payload, request.resource.replace(/\|\|/g, ''));

                                break;

                            default:
                                return 'Not a valid method: ' + request.method;
                        }

                        item.index = Number(index);
                        item.timestamp = Date.now() / 1000 | 0;

                        if (decorate) {
                            updateRefs(item.up.payload);
                            updateRefs(item.down.payload);
                        }

                        if (item.up.hasOwnProperty('payload') && item.up.payload.hasOwnProperty('_local')) {
                            delete item.up.payload._local;
                        }

                        log.push(item);
                        storage.insertItem('_log', log);
                    } 

                    // If we have a match, no need to go through remaining route patterns
                    return;
                }
            }
        }

        var defaults = {
    
            "POST.:resource": function(context, request) {

                var payload = request.payload,
                    uri = getSelfURI(payload).replace(/\|\|/g, '');

                if (this.hasItem(uri)) {
                    return { 
                        "_error"   : "DUPLICATE_KEY",
                        "resource" : uri
                    };
                }
    
                this.insertItem(uri, payload, true);
    
                this.addToCollection(context.resource, {
                    "href": uri
                });
    
                return {
                    "method"   : "DELETE",
                    "resource" : uri
                };
    
            },
    
            "DELETE.:resource/:id": function(context) {
    
                var resource = context.resource,
                    key = resource + '/' + context.id;
    
                if (!this.hasItem(key)) {
                    return { 
                        "_error"   : "MISSING_KEY", 
                        "resource" : key 
                    };
                }

                var item = this.getItem(key);
                this.removeItem(key);
    
                this.removeFromCollection(resource, function(obj) {
                    return obj.href == key;
                });
    
                return {
                    "method"   : "POST",
                    "resource" : resource,
                    "payload"  : item 
                };
    
            },
    
            "PATCH.:resource/:id": function(context, request) {

                var key = context.resource + '/' + context.id;

                if (!this.hasItem(key)) {
                    return { 
                        "_error"   : "MISSING_KEY", 
                        "resource" : key 
                    };
                }

                var item = this.getItem(key);

                var restore = {};
                for (var attr in request.payload) {
                    restore[attr] = item[attr];
                    item[attr] = request.payload[attr];
                }
    
                this.insertItem(key, item);
    
                return {
                    "method"   : "PATCH",
                    "resource" : request.resource,
                    "payload"  : restore
                };
            },
    
            "PUT.:resource/:id": function(context, request) {
    
                var key = context.resource + '/' + context.id;
     
                if (!this.hasItem(key)) {
                    return { 
                        "_error"   : "MISSING_KEY", 
                        "resource" : key 
                    };
                }

                var item = this.getItem(key);

                this.insertItem(key, request.payload, true);

                if (getSelfURI(item)) {
                    // Clean up object by removing leftover attributes
                    delete item['_links']['self']['href'];
                    if (!Object.keys(item['_links']['self']).length)
                        delete item['_links']['self'];
                    if (!Object.keys(item['_links']).length)
                        delete item['_links'];
                }
    
                return {
                    "method"   : "PUT",
                    "resource" : request.resource,
                    "payload"  : item
                };
    
            }

        };

        if (config) {

            if ('string' === typeof config.namespace) {
                namespace = config.namespace;
            }
            if ('object' !== typeof config.patterns) {
                config.patterns = {};
            }
            if ('function' === typeof config.syncEngine) {
                syncEngine = config.syncEngine;
            }

            if (true === config.debugMode)
                debugMode = config.debugMode;

            var initPatterns = function(patterns) {
                for (var key in patterns) {
                    var pattern = new UrlPattern(key);
                    patternMap[key] = {
                        pattern : pattern,
                        method  : patterns[key]
                    }
                }
            }

            // Install default route patterns
            initPatterns(defaults);

            // ... and those provided by client
            initPatterns(config.patterns);

        }
    
        var key;

        try {
            log = storage.getItem('_log');
        } catch(e) {
            console.log(e);
        }
        if (null == log) {
            log = [];
            storage.insertItem('_log', log);
        }

        try {
            messages = storage.getItem('_messages');
        } catch(e) {
            console.log(e);
        }
        if (null == messages) {
            messages = [];
            storage.insertItem('_messages', messages);
        }

        try {
            syncPoint = storage.getItem('_syncPoint');
        } catch(e) {
            console.log(e);
        }
        if (null == syncPoint) {
            syncPoint = 0;
            storage.insertItem('_syncPoint', syncPoint);
        }

        this.command = route.bind(null, true);
        this.reverse = route.bind(null, false);
        this.log = function() {
            return log;
        };
        this.messages = function() {
            return messages;
        };
        this.clearLog = function() {
            log = [];
            storage.insertItem('_log', log);
        };
        this.sync = function(targets, host, onComplete) { 

            var data = JSON.stringify({
                targets   : targets,
                syncPoint : syncPoint,
                commit    : log
            });
    
            var onSuccess = function(resp) {

                // --------------------------------------------------------------------
                // Rewind local stack: Traverse the log in reverse order and run
                // each action in reverse mode
        
                for (var i = log.length - 1; i >= 0; --i) {
                    this.reverse(log[i].down);
                }

                if (debugMode)
                    console.log(resp);

                // temp
                //$('#out-buffer').html(JSON.stringify({ 
                //    forward: resp.forward, 
                //    reverse: resp.reverse, 
                //    syncp: resp.syncp 
                //}, null, 4));

                // --------------------------------------------------------------------
                // Execute the transaction script 

                var errors = [];

                _.each(resp.reverse, function(item) {
                    var err = route(false, item);
                    if (err)
                        errors.push(err);
                });
                _.each(resp.forward, function(item) {
                    var err = route(true, item);
                    if (err)
                        errors.push(err);
                });

                console.log(errors);

                // --------------------------------------------------------------------
                // Finally, if sync operation is successful, we clear the local log.

                this.clearLog();

                messages = messages.concat(errors);
                syncPoint = resp.syncPoint;

                storage.insertItem('_messages', messages);
                storage.insertItem('_syncPoint', syncPoint);

                if (onComplete && typeof onComplete === 'function') {
                    onComplete(resp, errors);
                }

            }.bind(this);

            var onError = function(e) {
                console.log(e);
            };

            if (syncEngine) {

                syncEngine({
                    url     : host,
                    method  : 'POST',
                    data    : {
                        payload: data
                    }
                }, onSuccess, onError);

            } else {

                $.support.cors = true;
    
                $.ajax({
                    type     : 'POST',
                    url      : host,
                    data     : data,
                    error    : onError,
                    success  : onSuccess
                });

            }

        }
    }
}());
Endpoint.r = function(uri) { 
    // !!!!!!!!!!!!!!!!!!!!!!!!!!!!! TEMP HACK !!!!!!!!!!!!!!!
    if (-1 != uri.indexOf('.')) {
        return uri;
    }
    return '||' + uri + '||'; 
};
