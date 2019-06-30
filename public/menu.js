'use strict';

var socket;

document.getElementById("play").addEventListener("click", function(){
  document.getElementById("play").innerHTML = "setting up room...";
  socket = io("/search");
  socket.on("room-id", function(id){
    // give server breathing space
    window.setTimeout(function(){
      window.location.href = "/" + id;
    }, 400);
  });
});
