"use strict";

var socket = io(window.location.pathname);

var canvas = document.getElementById("whiteboard");
var ctx = canvas.getContext("2d");

function resizeCanvas(){
  canvas.width = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
  canvas.height = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
}
document.addEventListener("resize", resizeCanvas);
resizeCanvas();

function init(){
  setInterval(refreshBoard, 1000 / 60);
}
init();

// colors
var color = {
  self: '#0d9249',
  buddy: '#f76f49'
}
var client = {
  id: 0,
  mouseX: 0,
  mouseY: 0,
  curPath: null
};
function updateMousePos(e){
  var rect = canvas.getBoundingClientRect();
  client.mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
  client.mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);
}
document.addEventListener("mousemove", updateMousePos);

function refreshBoard(){
  ctx.clearRect(0, 0, canvas.width, canvas.height); // clears canvas
  drawObjects();
  drawCursor();
  handleInputs();
}

function drawCursor(){
  ctx.fillStyle = "#00f";
  for(var i = -2; i < 3; i++){
    ctx.fillRect(client.mouseX-1 + i * 4, client.mouseY-1, 2, 2);
    ctx.fillRect(client.mouseX-1, client.mouseY-1 + i * 4, 2, 2);
  }
}

function drawObjects(){
  for(var i = 0; i < boardObjects.length; i++){
    var o = boardObjects[i];
    if(o == null) continue;

    ctx.strokeStyle = o.owner == client.id ? color.self : color.buddy;
    switch(o.type){
      case 'path':
        ctx.beginPath();
        ctx.moveTo(o.nodes[0].x, o.nodes[0].y);
        for(var j = 1; j < o.nodes.length; j++)
          ctx.lineTo(o.nodes[j].x, o.nodes[j].y);
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
});
socket.on('pathStart', function(id, x, y, owner){
  boardObjects.push(new Path(id, x, y, owner));
});
socket.on('pathAddNode', function(id, x, y){
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
