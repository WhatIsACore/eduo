'use strict';

var config = require('./includes/config'),
    logger = require('./includes/logger'),
    sockets = require('./includes/sockets');

var express = require('express'),
    routes = express(),
    compression = require('compression'),
    minify = require('express-minify');

// TODO: turn this into an environment check and add HTTPS
var server = require('http').Server(routes);

routes.use(compression());
if(!config.debug) routes.use(minify());

// request pathways
routes.get('/', function(req, res, next){
        res.sendFile(__dirname + '/public/index.html');
      })
      .get('/:id', function(req, res, next){
        res.sendFile(__dirname + '/public/draw.html');
      })
      .use('/public', express.static(__dirname + '/public'));

server.listen(config.port, function(){
  logger.info('starting server on port ' + config.port);
});

// start socket.io
sockets.init(server);
