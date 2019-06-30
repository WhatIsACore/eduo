"use strict";

// pretend we have jquery
function $(query){
  var q = document.querySelectorAll(query);
  return q.length > 1 ? q : q[0];
}

var socket = io(window.location.pathname);

var canvas = $("#whiteboard");
var ctx = canvas.getContext("2d");

function init(){
  setInterval(refreshBoard, 1000 / 60);
}

// colors
var color = {
  self: '#0d9249',
  buddy: '#f76f49'
}
var client = {
  id: 0,
  mouseX: 0,
  mouseY: 0,
  xOffset: canvas.width / 2,
  curPath: null,
  selfCursor: $("#cursor-green"),
  buddyCursor: $("#cursor-orange"),
  lastMouseUpdate: 0,
  timerTarget: null,
  question: null
};

function resizeCanvas(){
  canvas.width = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
  canvas.height = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
  client.xOffset = canvas.width / 2;
}
document.addEventListener("resize", resizeCanvas);
resizeCanvas();

function updateMousePos(e){
  var rect = canvas.getBoundingClientRect();
  client.mouseX = (e.clientX - rect.left) * (canvas.width / rect.width) - client.xOffset;
  client.mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);
  client.selfCursor.style.marginLeft = (client.mouseX - 5 + client.xOffset) + "px";
  client.selfCursor.style.marginTop = (client.mouseY - 50) + "px";
  if(Date.now() - client.lastMouseUpdate > 1000/30){
    socket.emit('mouseMove', client.mouseX, client.mouseY);
    client.lastMouseUpdate = Date.now();
  }
}
document.addEventListener("mousemove", updateMousePos);

var timer = $('#timer');
function refreshBoard(){
  ctx.clearRect(0, 0, canvas.width, canvas.height); // clears canvas
  drawObjects();
  handleInputs();

  // handle timer
  if(client.timerTarget != null){
    var millisRemaining = client.timerTarget - Date.now();
    var minutes = Math.floor(millisRemaining / (1000 * 60)).toString().padStart(2, '0');
    var seconds = Math.max(Math.floor(millisRemaining % (1000 * 60) / 1000), 0).toString().padStart(2, '0');
    timer.innerHTML = minutes + ':' + seconds;
  }
}

function drawObjects(){
  ctx.lineWidth = 3;
  for(var i = 0; i < boardObjects.length; i++){
    var o = boardObjects[i];
    if(o == null) continue;

    ctx.strokeStyle = o.owner == client.id ? color.self : color.buddy;
    switch(o.type){
      case 'path':
        ctx.beginPath();
        ctx.moveTo(o.nodes[0].x + client.xOffset, o.nodes[0].y);
        for(var j = 1; j < o.nodes.length; j++)
          ctx.lineTo(o.nodes[j].x + client.xOffset, o.nodes[j].y);
        ctx.stroke();
        ctx.closePath();
        break;
      default:
    }
  }
}

document.addEventListener("keydown", function(e){
  // disable default ctrl functionality
  if(e.keyCode == 17 || e.ctrlKey)
    e.preventDefault();

  // handle keycodes
  switch(e.keyCode){
    case 17:
      if(client.curPath == null)
        startPath();
      break;
  }
}, false);

document.addEventListener("keyup", function(e){
  if(e.keyCode == 17) endPath();
}, false);

var submit = $('#submit-input');
submit.addEventListener("input", updateAnswer);
submit.addEventListener("propertychange", updateAnswer);
function updateAnswer(){
  socket.emit('updateAnswer', submit.value);
}

function handleInputs(){
  // continue path currently being drawn
  if(client.curPath != null){
    var newX = client.mouseX;
    var newY = client.mouseY;
    client.curPath.nodes.push({x: newX, y: newY});
    socket.emit('pathAddNode', client.curPath.id, newX, newY);
  }
}

var boardObjects = [];

socket.on('update', function(id, objects){
  client.id = id;
  boardObjects = objects;
  init();
});
socket.on('clear', function(){
  boardObjects = [];
});
socket.on('pathStart', function(id, x, y, owner){
  boardObjects.push(new Path(id, x, y, owner));
});
socket.on('pathAddNode', function(id, x, y, owner){
  for(var i in boardObjects){ // augment an existing node
    if(boardObjects[i].id == id){
      boardObjects[i].nodes.push({x: x, y: y});
      break;
    }
  }
});
socket.on('pathDelete', function(id){
  for(var i in boardObjects){
    if(boardObjects[i].id == id){
      boardObjects[i] = null;
      break;
    }
  }
});
socket.on('mouseMove', function(x, y, owner){ // other cursor moved
  client.buddyCursor.style.marginLeft = (x - 5 + client.xOffset) + "px";
  client.buddyCursor.style.marginTop = (y - 50) + "px";
});
socket.on('updateAnswer', function(value){
  $('#submit-input').value = value;
});

// question controls
var infoText = $('#info');
socket.on('questionReady', function(time){
  client.timerTarget = time;
  $("#submit-box").className = "disabled";
  infoText.innerHTML = "get ready...";
});
socket.on('questionUpdate', function(time, question){
  client.timerTarget = time;
  $("#submit-box").className = "";
  submit.value = "";
  infoText.innerHTML = question.text;
});
socket.on('questionResult', function(time, result){
  client.timerTarget = time;
  $("#submit-box").className = "disabled";
  $("#blur").focus();
  infoText.innerHTML = result ? "Great job! Get ready for the next one!" : "Too bad, let's try again!";
});

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

// inputs
function startPath(){
  var p = new Path(Date.now(), client.mouseX, client.mouseY, client.id);
  boardObjects.push(p);
  client.curPath = p;
  socket.emit('pathStart', p.id, p.nodes[0].x, p.nodes[0].y);
}
function endPath(){
  client.curPath = null;
}
