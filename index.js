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
    console.log('New pusher found: %s', controller.params.macAddress);
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
        Object.keys(ledColors).forEach(function (key) {
            var value = ledColors[key];
            var mac_addr = '00:04:a3:' + key.slice(0, 2) + ':' + key.slice(2, 4) + ':' + key.slice(4, 6);
            if (mac_addr in pixelpusher.controllers) {
                var ctrl = pixelpusher.controllers[mac_addr];
                var buf = getStripData(value);
                ctrl.refresh(buf);
            }
        });

        //console.log(ledColors);

    })

    socket.on('error', function (err) {
        console.error(err.stack);
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
    });
};

var writeMappingToDisk = function () {

    fs.writeFile(mappingFilename, JSON.stringify(mapping, null, 4), function (err) {
        if (err) {
            console.log(err);
        } else {
            console.log("JSON saved to " + mappingFilename);
        }
    });
};

var toBuffer = function (ab) {
    var buffer = new Buffer(ab.length);
    var view = new Uint8Array(ab);
    for (var i = 0; i < buffer.length; ++i) {
        buffer[i] = view[i];
    }
    return buffer;
};

var getStripData = function (values) {
    var rendered = [];
    var num_pixels = null;
    for (var strip_idx = 0; strip_idx < values.length; strip_idx++) {
        if (values[strip_idx] == undefined) {
            continue;
        }
        num_pixels = values[strip_idx].length;
        break;
    }
    for (var strip_idx = 0; strip_idx < values.length; strip_idx++) {
        var ps = new PixelPusher.PixelStrip(strip_idx, num_pixels);
        if (!(values[strip_idx] == undefined)) {
            var strip_values = values[strip_idx];

            for (var pixel_idx = 0; pixel_idx < num_pixels; pixel_idx++) {
                var pixel_value = strip_values[pixel_idx];
                ps.getPixel(pixel_idx).setColor(pixel_value[0], pixel_value[1], pixel_value[2]);
            }
        }
        rendered.push(ps.getStripData());
    }
    return rendered;
}

readMappingFromDisk();
