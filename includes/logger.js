'use strict';

var winston = require('winston');
var config = require('./config');

// output log files
const logger = winston.createLogger({
  transports: [
    new winston.transports.File({filename: './logs/server.log'})
  ]
});

// if in debug, also output to console
if(config.debug){
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

module.exports = logger;
