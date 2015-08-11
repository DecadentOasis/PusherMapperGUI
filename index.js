var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var fs = require('fs');
var PixelPusher = require('heroic-pixel-pusher');

var pixelpusher = new PixelPusher();
var pushers = {};

pixelpusher.on('error', function (err) {
    console.log('PixelPusher Error: ' + err.message);
});

pixelpusher.on('discover', function (controller) {
    var mac_addr = controller.params.macAddress.replace(/\:/g, '').slice(6);
    pushers[mac_addr] = controller.params.pixelpusher;
    io.emit('pushers', pushers);
});

var mapping;

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});

app.use('/bower_components', express.static(__dirname + '/bower_components'));
app.use('/js', express.static(__dirname + '/js'));
app.use('/css', express.static(__dirname + '/css'));
app.use('/img', express.static(__dirname + '/img'));


io.on('connection', function (socket) {
    console.log('a user connected');
    socket.on('disconnect', function () {
        console.log('user disconnected');
    });

    socket.on('pusher select', function (mac_addr) {
        console.log('Pusher Selected, MAC: ' + mac_addr);
    });

    socket.on('save tree', function (mac_addr, strip_no, type, x, y, rot) {
        console.log('Tree save requested. MAC: %s, Strip#: %s, type: %s, (%s, %s) rot: %s', mac_addr, strip_no, type, x, y, rot);
        var fixture = mapping[mac_addr][strip_no];
        fixture.type = type;
        fixture.center = [x, y];
        fixture.rotation = rot;
        writeMappingToDisk();
        console.log('Tree saved!');
    });

    socket.on('list pushers', function () {
        console.log('list pushers called');
        console.log(pushers);
        socket.emit('pushers', pushers);
    });

    socket.on('get mapping', function () {
        console.log('get mapping called');
        socket.emit('pusher mapping', mapping);
    });

    socket.on('sc', function (ledColors) {
        console.log(ledColors);
    })
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

    fs.writeFile(mappingFilename, JSON.stringify(mapping, null, 4), function (err) {
        if (err) {
            console.log(err);
        } else {
            console.log("JSON saved to " + mappingFilename);
        }
    });
}

readMappingFromDisk();
