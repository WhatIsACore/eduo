'use strict';

// room = a game instance, with an observer that the server sends output to and several controllers.
// controller = a mobile screen, sends input to the server

var logger = require('./logger');
var room = require('./room');

var io;

// called once to initialize the socket io server
function init(server){
  io = require('socket.io')(server);

  // for people searching for a room
  io.of('/search').on('connection', function(socket){

    // find an open room
    var found = false;
    for(var i in rooms){
      var r = rooms[i];
      if(r.defunct && r.size == 0){ // clear empty defunct rooms
        delete rooms[i];
        continue;
      }
      if(r.size < r.maxSize && !r.defunct){
        found = true;
        socket.emit('room-id', r.id);
        break;
      }
    }
    if(!found){
      // if no open rooms, make a new room
      var id = Math.floor(Math.random() * 100000);
      while(id in rooms) id = Math.floor(Math.random() * 100000);
      rooms[id] = new room.Room(id, io);
      socket.emit('room-id', id);
    }
  });
}
module.exports.init = init;

var rooms = {};
