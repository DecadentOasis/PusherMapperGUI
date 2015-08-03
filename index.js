var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var pushers = ['95E33CC97C0D', 'DCC54C3705C1'];

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket){
  console.log('a user connected');
  io.emit('known pushers', pushers);
  socket.on('disconnect', function() {
    console.log('user disconnected');
  });
  socket.on('pusher select', function(mac_addr) {
    console.log('Pusher Selected, MAC: ' + mac_addr);
  });
});

http.listen(3000, function(){
  console.log('listening on *:3000');
});

io.emit('pusher discovered', 'D34DB33F');
