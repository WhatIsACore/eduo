'use strict';

// room = a game instance, with an observer that the server sends output to and several controllers.
// controller = a mobile screen, sends input to the server

var logger = require('./logger');

var io;

// called once to initialize the socket io server
function init(server){
  io = require('socket.io')(server);
  //setInterval(updateRooms, 1000 / 60); // 60 updates per second
}
module.exports.init = init;

function updateRooms(){
}

var rooms = {};

var Room = function(id, observer){
  this.id = id;
  this.io = io.of('/' + id);
  this.io.on('connection', this.connectUser);
  this.users = [];
}
Room.prototype.connectUser = function(){

}
