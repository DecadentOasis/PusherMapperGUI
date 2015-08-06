var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var fs = require('fs');

var pushers = {
    '95E33CC97C0D': {},
    'DCC54C3705C1': {}
};

var mapping;

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});

app.use('/bower_components', express.static(__dirname + '/bower_components'));
app.use('/js', express.static(__dirname + '/js'));
app.use('/css', express.static(__dirname + '/css'));


io.on('connection', function (socket) {
    console.log('a user connected');
    socket.on('disconnect', function () {
        console.log('user disconnected');
    });

    socket.on('pusher select', function (mac_addr) {
        console.log('Pusher Selected, MAC: ' + mac_addr);
    });

    socket.on('save tree', function (mac_addr, strip_no, type, x, y) {
        console.log('Tree save requested. MAC: %s, Strip#: %s, type: %s, (%s, %s)', mac_addr, strip_no, type, x, y);
        var fixture = mapping[mac_addr][strip_no];
        fixture.type = type;
        fixture.center = [x, y];
        writeMappingToDisk();
        console.log('Tree saved!');
    });

    socket.on('list pushers', function () {
        Object.keys(pushers).forEach(function (key) {
            pushers[key].timestamp = (new Date);
        })
        console.log('list pushers called');
        socket.emit('pushers', pushers);
    });

    socket.on('get mapping', function () {
        console.log('get mapping called');
        socket.emit('pusher mapping', mapping);
    });
});

http.listen(3000, function () {
    console.log('listening on *:3000');
});

var mappingFilename = 'mapping.json';

var readMappingFromDisk = function () {
    fs.readFile(mappingFilename, 'utf8', function (err, data) {
        if (err) {
            console.log(err);
            return;
        }
        mapping = JSON.parse(data);
        console.log('Read mapping JSON:');
        console.log(mapping);
    });
}

var writeMappingToDisk = function () {

    fs.writeFile(mappingFilename, JSON.stringify(mapping, null, 4), function(err) {
        if(err) {
            console.log(err);
        } else {
            console.log("JSON saved to " + mappingFilename);
        }
    });
}

readMappingFromDisk();