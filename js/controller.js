var app = angular.module('PusherMapperGUI', [
    'btford.socket-io',
    'ngDragDrop',
    'ngMaterial',
]);
app.factory('mySocket', function (socketFactory) {
    var mySocket = socketFactory();
    mySocket.forward('error');
    mySocket.forward('pushers');
    mySocket.forward('pusher mapping');
    return mySocket;
});

app.controller('IndexCtrl', function ($scope, mySocket) {

    $scope.$on('socket:error', function (ev, data) {
        console.log(data);
    });
    $scope.$on('socket:pushers', function (ev, data) {
        angular.forEach(data, function (value, key) {
            $scope.pushers[key] = value;
        });
        $scope.pushers = data;

    });

    var treePressMove = function(evt) {
        evt.target.x = evt.stageX;
        evt.target.y = evt.stageY;
        $scope.stage.update();
    }

    var treePressUp = function(evt) { console.log("up"); }

    $scope.$on('socket:pusher mapping', function (ev, data) {
        $scope.mapping = data;
        var canvas = document.getElementById('forest-preview');
        if (canvas.getContext){
            var ctx = canvas.getContext('2d');
            ctx.canvas.width  = window.innerWidth;
            ctx.canvas.height = window.innerHeight;
            //ctx.fillStyle = "rgb(200,0,0)";
            angular.forEach(data, function(value, key) {
                var pusher = value;
                for (var i = pusher.length - 1; i >= 0; i--) {
                    var coords = getRelativeCoords(pusher[i].center, ctx);
                    var x = coords[0];
                    var y = coords[1];
                    var size = 20;
                    //ctx.fillRect(x-size, y-size, size, size);
                    var circle = new createjs.Shape();
                    circle.graphics.beginFill("DeepSkyBlue").drawCircle(0, 0, 20);
                    circle.x = x;
                    circle.y = y;
                    circle.on("pressmove", treePressMove);
                    circle.on("pressup", treePressUp);
                    $scope.stage.addChild(circle);
                };
            });
        }
        $scope.stage.update();
    });

    $scope.getPushers = function () {
        mySocket.emit('list pushers');
    };

    $scope.getMapping = function () {
        mySocket.emit('get mapping');
    };

    $scope.getForestWidth = function () {
        return document.getElementById('forest_preview').clientWidth;
    };

    $scope.getForestHeight = function () {
        return document.getElementById('forest_preview').clientHeight;
    };

    $scope.stopCallback = function (event, ui) {
        var w = $scope.getForestWidth();
        var h = $scope.getForestHeight();;
        var l = ui.position.left;
        var t = ui.position.top;
        var x = Math.round((l - (w / 2)) / (w / 2) * 100) / 100;
        var y = Math.round((t - (h / 2)) / (h / 2) * 100) / 100;
        var mac_addr = this.$parent.key;
        var fixture_type = this.fixture.type;
        this.fixture.center[0] = x;
        this.fixture.center[1] = y;
        var strip_no = this.$index;
        console.log('%d,%d: %f,%f', ui.offset.left, ui.offset.top, x, y);
        console.log(this.fixture);
        mySocket.emit('save tree', mac_addr, strip_no, fixture_type, x, y);
        $scope.$apply();
    };

    var getRelativeCoords = function(coords, ctx) {
        var w = ctx.canvas.width;
        var h = ctx.canvas.height;
        var x = (coords[0] * (w / 2)) + w / 2;
        var y = (coords[1] * (h / 2)) + h / 2;
        return [x, y];
    };

    $scope.getStyle = function (center) {

        var w = $scope.getForestWidth();
        var h = $scope.getForestHeight();;
        var x = (center[0] * (w / 2)) + w / 2;
        var y = (center[1] * (h / 2)) + h / 2;
        return {'top': y + 'px', 'left': x + 'px'};
    };


    $scope.pushers = {};
    $scope.getPushers();
    $scope.getMapping();

    $scope.stage = new createjs.Stage("forest-preview");

});
