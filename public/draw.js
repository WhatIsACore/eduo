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
  curText: null,
  selfCursor: $("#cursor-green"),
  buddyCursor: $("#cursor-orange"),
  lastMouseUpdate: 0,
  timerTarget: null,
  question: null,
  submitted: false,
  submitProgress: 0
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
    var seconds = Math.max(Math.floor((millisRemaining - 200) % (1000 * 60) / 1000), 0).toString().padStart(2, '0');
    timer.innerHTML = minutes + ':' + seconds;
  }
}

function drawObjects(){
  ctx.lineWidth = 3;
  for(var i = 0; i < boardObjects.length; i++){
    var o = boardObjects[i];
    if(o == null) continue;

    ctx.strokeStyle = o.owner == client.id ? color.self : color.buddy;
    ctx.fillStyle = ctx.strokeStyle;
    switch(o.type){
      case 'path':
        ctx.beginPath();
        ctx.moveTo(o.nodes[0].x + client.xOffset, o.nodes[0].y);
        for(var j = 1; j < o.nodes.length; j++)
          ctx.lineTo(o.nodes[j].x + client.xOffset, o.nodes[j].y);
        ctx.stroke();
        ctx.closePath();
        break;
      case 'text':
        if(client.curText == o) break;
        ctx.font = '22px Barlow';
        ctx.fillText(o.value, o.x + client.xOffset, o.y);
        break;
    }
  }
}

document.addEventListener("keydown", function(e){
  // disable default ctrl functionality
  if(e.keyCode == 17 || e.ctrlKey)
    e.preventDefault();

  // handle keycodes
  switch(true){
    case (e.keyCode == 17 && client.curPath == null):
      startPath();
      break;
    case (e.keyCode >= 48 && e.keyCode <= 90 && client.curText == null && document.activeElement != submitField):
      createText(e.keyCode);
      break;
    case (e.keyCode == 13 && client.curText != null):
      endPath();
      break;
  }
}, false);

document.addEventListener("keyup", function(e){
  if(e.keyCode == 17) endPath();
}, false);

document.addEventListener("click", function(){
  if(client.curText != null) closeText();
});

var submitField = $('#submit-input');
submitField.addEventListener("input", updateAnswer);
submitField.addEventListener("propertychange", updateAnswer);
function updateAnswer(){
  client.submitted = false;
  client.submitProgress = 0;
  socket.emit('updateAnswer', submitField.value);
  $('#submit-progress').innerHTML = client.submitProgress;
  submitBtn.className = submitField.value.length > 0 ? "" : "disabled";
}
submitField.addEventListener('keydown', function(){
  submitBtn.click();
});

var submitBtn = $('#submit-btn');
submitBtn.addEventListener("click", function(){
  if(client.submitted) return;
  submitBtn.className = 'submitted';
  client.submitted = true;
  client.submitProgress++;
  socket.emit('submitAnswer');
  $('#submit-progress').innerHTML = client.submitProgress;
})

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
socket.on('textCreate', function(id, x, y, value, owner){
  boardObjects.push(new Text(id, x, y, value, owner));
});
socket.on('textUpdate', function(id, value){
  for(var i in boardObjects){ // augment an existing node
    if(boardObjects[i].id == id){
      boardObjects[i].value = value;
      break;
    }
  }
});

socket.on('mouseMove', function(x, y, owner){ // other cursor moved
  client.buddyCursor.style.marginLeft = (x - 5 + client.xOffset) + "px";
  client.buddyCursor.style.marginTop = (y - 50) + "px";
});
socket.on('updateAnswer', function(value){
  submitField.value = value;
  client.submitted = false;
  client.submitProgress = 0;
  $('#submit-progress').innerHTML = client.submitProgress;
  submitBtn.className = submitField.value.length > 0 ? "" : "disabled";
});
socket.on('submitAnswer', function(){
  client.submitProgress++;
  $('#submit-progress').innerHTML = client.submitProgress;
})

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
  submitField.value = "";
  infoText.innerHTML = question.text;
  client.submitProgress = 0;
  $('#submit-progress').innerHTML = client.submitProgress;
  $('#submit-btn').className = "disabled";
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
var Text = function(id, x, y, value, owner){
  this.type = 'text';
  this.id = id;
  this.x = x;
  this.y = y;
  this.value = value;
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

// we use a input field to handle text creation
var typebox = $('#typebox');
function createText(key){
  var t = new Text(Date.now(), client.mouseX - 5, client.mouseY + 20, String.fromCharCode(key), client.id);
  boardObjects.push(t);
  client.curText = t;
  socket.emit('textCreate', t.id, t.x, t.y);
  typebox.style.marginLeft = t.x + client.xOffset + "px";
  typebox.style.marginTop = (t.y - 22) + "px";
  typebox.className = "active";
  typebox.focus();
}
function closeText(){
  client.curText = null;
  typebox.className = "";
  typebox.value = "";
  $("#blur").focus();
}
typebox.addEventListener('keydown', function(e){
  if(e.keyCode == 13) closeText();
});
typebox.addEventListener('input', function(){
  client.curText.value = typebox.value;
  socket.emit('textUpdate', client.curText.id, typebox.value);
});
