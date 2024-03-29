'use strict';

var logger = require('./logger');
var questions = require('./questions');

var Room = function(id, io){
  this.id = id;
  this.io = io.of('/' + id);
  this.io.on('connection', this.connectClient.bind(this));
  this.users = {};
  this.size = 0;
  this.maxSize = 2;
  this.objects = [];
  this.defunct = false;
  this.phase = 0; // 0 = lobby, 1 = ready, 2 = question, 3 = result
  this.answerInput = "";
  this.submitProgress = 0;
  logger.info('created Room id=' + id);
}
module.exports.Room = Room;

Room.prototype.connectClient = function(socket){

  if(this.size >= this.maxSize || this.defunct){
    socket.disconnect();
    return;
  }

  this.size++;
  var id = Math.floor(Math.random() * 100000);
  while(id in this.users) id = Math.floor(Math.random() * 100000);
  this.users[id] = new User(id, socket);
  socket.user = this.users[id];
  this.info('connected User id=' + id);

  // emit current state
  socket.emit('update', id, this.objects);

  // begin game
  if(this.size == this.maxSize && this.question == null) this.startGame();

  socket.on('disconnect', (function(){
    this.info('disconnected User id=' + socket.user.id);
    delete this.users[socket.user.id];
    socket.disconnect();
    this.size--;
    this.io.emit('buddyLeft');
    this.phase = 0;
    this.defunct = true; // flag for deletion
  }).bind(this));

  socket.on('clear', this.clear.bind(this));

  // whiteboard events
  socket.on('pathStart', function(id, x, y){
    for(var i in this.users) // emit excluding sender
      if(this.users[i] != socket.user)
        this.users[i].socket.emit('pathStart', id, x, y, socket.user.id);

    this.objects.push(new Path(id, x, y, socket.user.id));
  }.bind(this));

  socket.on('pathAddNode', function(id, x, y){
    for(var i in this.users) // emit excluding sender
      if(this.users[i] != socket.user)
        this.users[i].socket.emit('pathAddNode', id, x, y);

    for(var i in this.objects){ // augment an existing node
      if(this.objects[i].id == id){
        this.objects[i].nodes.push({x: x, y: y});
        break;
      }
    }
  }.bind(this));

  socket.on('textCreate', function(id, x, y, value){
    for(var i in this.users) // emit excluding sender
      if(this.users[i] != socket.user)
        this.users[i].socket.emit('textCreate', id, x, y, value, socket.user.id);

    this.objects.push(new Text(id, x, y, value,socket.user.id));
  }.bind(this));

  socket.on('textUpdate', function(id, value){
    for(var i in this.users) // emit excluding sender
      if(this.users[i] != socket.user)
        this.users[i].socket.emit('textUpdate', id, value);

    for(var i in this.objects){ // modify a value
      if(this.objects[i].id == id){
        this.objects[i].value = value;
        break;
      }
    }
  }.bind(this))

  socket.on('mouseMove', function(x, y){
    for(var i in this.users) // emit excluding sender
      if(this.users[i] != socket.user)
        this.users[i].socket.emit('mouseMove', x, y, socket.user.id);
  }.bind(this));

  socket.on('updateAnswer', function(value){
    this.answerInput = value;
    this.submitProgress = 0;
    for(var i in this.users) // emit excluding sender
      if(this.users[i] != socket.user)
        this.users[i].socket.emit('updateAnswer', value);
  }.bind(this));

  socket.on('submitAnswer', function(){
    this.submitProgress++;
    for(var i in this.users) // emit excluding sender
      if(this.users[i] != socket.user)
        this.users[i].socket.emit('submitAnswer');
    if(this.submitProgress == this.maxSize){
      clearTimeout(this.timeout);
      this.getResult();
    }
  }.bind(this));

}

Room.prototype.clear = function(){
  this.objects = [];
  this.io.emit('clear');
}

Room.prototype.startGame = function(){
  this.phase = 1;
  this.startTime = Date.now();
  this.io.emit('questionReady', this.startTime + 5000);
  setTimeout(this.serveQuestion.bind(this), 5000);
}

Room.prototype.serveQuestion = function(){
  this.phase = 2;
  this.answerInput = "";
  this.question = questions.math[Math.floor(Math.random() * questions.math.length)];
  this.startTime = Date.now();
  this.clear();
  this.io.emit('questionUpdate', this.startTime + this.question.duration * 1000, this.question);
  this.timeout = setTimeout(this.getResult.bind(this), this.question.duration * 1000);
}

Room.prototype.getResult = function(){
  this.phase = 3;
  this.startTime = Date.now();
  this.io.emit('questionResult', this.startTime + 5000, this.answerInput == this.question.answer); // TODO: check if question was answered correctly
  this.timeout = setTimeout(this.serveQuestion.bind(this), 5000);
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
  this.type = 'path';
  this.id = id;
  this.nodes = [{
    x: x,
    y: y
  }];
  this.owner = owner;
}

var Text = function(id, x, y, value, owner){
  this.type = 'text';
  this.id = id;
  this.x = x;
  this.y = y;
  this.value = value;
  this.owner = owner;
}
