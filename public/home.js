"use strict";

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

var client = {
  mouseX: 0,
  mouseY: 0
};
function updateMousePos(e){
  var rect = canvas.getBoundingClientRect();
  client.mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
  client.mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);
}
document.addEventListener("mousemove", updateMousePos);

function refreshBoard(){
  ctx.clearRect(0, 0, canvas.width, canvas.height); // clears canvas

  ctx.fillStyle = "#00f";
  for(var i = -2; i < 3; i++){
    ctx.fillRect(client.mouseX-1 + i * 4, client.mouseY-1, 2, 2);
    ctx.fillRect(client.mouseX-1, client.mouseY-1 + i * 4, 2, 2);
  }
}
