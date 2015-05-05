"use strict";
var OAuthSync = (function(){
    return function(config) {

        function getQueryVariable(query, variable) {
            var vars = query.split('&');
            for (var i = 0; i < vars.length; i++) {
                var pair = vars[i].split('=');
                if (pair[0] == variable)
                    return pair[1];
            }
            return false;
        }
        
        var consumerKey    = '',
            consumerSecret = '',
            requestToken   = null,
            accessToken    = null;
        
        var tokenRequestSuffix = 'request',
            tokenAccessSuffix = 'access',
            syncSuffix = 'sync';
        
        var endpoint = '';
        
        var obtainToken = function(conf) {
        
            var requestData = {
                url: endpoint.replace(/\/$/, '') + '/' + conf.url,
                method: 'POST'
            };
        
            $.support.cors = true;

            var dataObj = oauth.authorize(requestData, conf.token);

            $.ajax({
                url: requestData.url,
                type: requestData.method,
                data: dataObj,
                error: function(e) {
                    if (conf.error && typeof conf.error === 'function') {
                        conf.error(e);
                    }
                },
                success: function(resp) {
                    var param = getQueryVariable.bind(null, resp);
                    if (conf.success && typeof conf.success === 'function') {
                        conf.success({
                            public: param('oauth_token'),
                            secret: param('oauth_token_secret')
                        });
                    }
                }
            });
        
        };
        
        var sync = function(requestData, onSuccess, onError) {
        
            var runner = function() {
        
                if (accessToken) {
        
                    console.log('Access token --->' + JSON.stringify(accessToken));
           
                    $.support.cors = true;

                    if (!requestData.url)
                        requestData.url = endpoint.replace(/\/$/, '') + '/' + syncSuffix;

                    $.ajax({
                        url: requestData.url,
                        type: requestData.method,
                        data: oauth.authorize(requestData, accessToken),
                        error: function(e) {
        
                            if ('function' === typeof onError)
                                onError(e);

                            // If token is expired, delete the token and try again
                            //accessToken = null;
                            //runner();
        
                        },
                        success: onSuccess
                    });
        
                } else {
        
                    if (requestToken) {
        
                        obtainToken({
                            url: tokenAccessSuffix,
                            token: requestToken,
                            success: function(token) {
                                accessToken = token;
                                runner();
                            },
                            error: function(e) {

                                alert(e.responseText || "Connection error.");
        
                                console.log(e);
        
                                if ('function' === typeof onError)
                                    onError(e);

                                // If request token is expired, delete the token and try again
        
                                //requestToken = null;
                                //runner();
                            }
                        });
        
                    } else {
                        obtainToken({
                            url: tokenRequestSuffix,
                            success: function(token) {
                                requestToken = token;
                                runner();
                            },
                            error: function(e) {

                                alert(e.responseText || "Connection error.");

                                if ('function' === typeof onError) {
                                    onError(e);
                                }
                            }
                        });
                    }
        
                }
        
            };
        
            runner();
        
        };
    
        consumerKey = config.key;
        consumerSecret = config.secret;
        endpoint = config.endpoint;
    
        if (config.requestSuffix && 'string' === typeof config.requestSuffix)
            tokenRequestSuffix = config.requestSuffix;
    
        if (config.accessSuffix && 'string' === typeof config.accessSuffix)
            tokenAccessSuffix = config.accessSuffix;

        var oauth = OAuth({
            consumer: {
                public: consumerKey,
                secret: consumerSecret
            },
            signature_method: config.signatureMethod || 'PLAINTEXT'
        });
 
        return sync;
    
    };

}());
