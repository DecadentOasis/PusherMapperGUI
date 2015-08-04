var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var pushers = {
  '95E33CC97C0D': {},
  'DCC54C3705C1': {}
};

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

app.use('/bower_components', express.static(__dirname + '/bower_components'));
app.use('/js', express.static(__dirname + '/js'));


io.on('connection', function(socket){
  console.log('a user connected');
  socket.on('disconnect', function() {
    console.log('user disconnected');
  });
  socket.on('pusher select', function(mac_addr) {
    console.log('Pusher Selected, MAC: ' + mac_addr);
  });
  socket.on('list pushers', function() {
    Object.keys(pushers).forEach(function(key) {
      pushers[key].timestamp = (new Date);
    })
    /**
    for (var pusher_idx = 0; pusher_idx < pushers.length; pusher_idx++) {
      pushers[pusher_idx].timestamp = (new Date);

    } **/


    socket.emit('pushers', pushers);
  })
});

http.listen(3000, function(){
  console.log('listening on *:3000');
});
