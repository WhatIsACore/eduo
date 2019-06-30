'use strict';

var socket;

document.getElementById("play").addEventListener("click", function(){
  socket = io("/search");
  socket.on("room-id", function(id){
    window.location.href = "/" + id;
  });
});
