'use strict';

var logger = require('./logger');

var Room = function(id, io){
  this.id = id;
  this.io = io.of('/' + id);
  this.io.on('connection', this.connectClient.bind(this));
  this.users = {};
  this.size = 0;
  this.maxSize = 2;
  this.objects = [];
  logger.info('created Room id=' + id);
}
module.exports.Room = Room;

Room.prototype.connectClient = function(socket){

  if(this.size >= this.maxSize){
    socket.disconnect();
    return;
  }

  this.size++;
  var id = Math.floor(Math.random() * 100000);
  while(id in this.users) id = Math.floor(Math.random() * 100000);
  this.users[id] = new User(id, socket);
  socket.user = this.users[id];
  this.info('connected User id=' + id);

  socket.on('disconnect', (function(){
    this.info('disconnected User id=' + socket.user.id);
    delete this.users[socket.user.id];
    socket.disconnect();
    this.size--;
  }).bind(this));

  // whiteboard events
  socket.on('pathStart', function(id, x, y){
    socket.to('/' + this.id).emit('pathStart', id, x, y);
    this.objects.push(new Path(id, x, y));
  });
  socket.on('pathAddNode', function(id, x, y){
    socket.to('/' + this.id).emit('pathAddNode', id, x, y);
    for(var i in this.objects){ // augment an existing node
      if(this.objects[i].id == id){
        this.objects[i].nodes.push({x: x, y: y});
        break;
      }
    }
  });
  socket.on('pathDelete', function(id){
    socket.to('/' + this.id).emit('pathDelete', id, x, y);
    for(var i in this.objects){
      if(this.objects[i].id == id){
        this.objects[i] = null;
        break;
      }
    }
  });

}

// easy debugging
Room.prototype.info = function(m){
  logger.info('Room ' + this.id + ': ' + m);
}

var User = function(id, socket){
  this.id = id;
  this.socket = socket;
}

// whiteboard objects
var Path = function(id, x, y, owner){
  this.id = id;
  this.nodes = [{
    x: x,
    y: y
  }];
  this.owner = owner;
}
