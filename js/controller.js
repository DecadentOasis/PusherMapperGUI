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
        updateField();

    });

    var KEYCODE_KEYR = 82;

    var MODES = {
        DRAG: 0,
        ROTATE: 1
    };

    $scope.editMode = MODES.DRAG;

    var keyPressed = function (evt) {
        switch (evt.keyCode) {
            case KEYCODE_KEYR:
                $scope.editMode = MODES.ROTATE;
                break;
        }
    };


    var treePressMove = function (evt) {
        if (evt.currentTarget.selected) {
            switch ($scope.editMode) {
                case MODES.DRAG:
                    evt.currentTarget.x = evt.stageX;
                    evt.currentTarget.y = evt.stageY;
                    break;
                case MODES.ROTATE:
                    evt.currentTarget.rotation = 360 * (evt.stageY / this.parent.canvas.clientHeight);
                    break;
            }
            $scope.stage.update();
        }
    };

    var treePressUp = function (evt) {
        var l = evt.currentTarget.x;
        var t = evt.currentTarget.y;
        var rot = evt.currentTarget.rotation;

        var w = this.parent.canvas.clientWidth;
        var h = this.parent.canvas.clientHeight;
        var x = Math.round((l - (w / 2)) / (w / 2) * 100) / 100;
        var y = Math.round((t - (h / 2)) / (h / 2) * 100) / 100;
        var mac_addr = this.mac_addr;
        var fixture_type = this.type;
        var strip_no = this.strip_no;
        mySocket.emit('save tree', mac_addr, strip_no, fixture_type, x, y, rot);
    };

    var treeClick = function (evt) {
        console.log(evt);
        if (evt.currentTarget.selected == undefined || evt.currentTarget.selected == false) {
            evt.currentTarget.selected = true;
            evt.currentTarget.saved_alpha = evt.currentTarget.alpha;
            evt.currentTarget.alpha = 1;
        } else {
            evt.currentTarget.selected = false;
            evt.currentTarget.alpha = evt.currentTarget.saved_alpha;
        }
        $scope.stage.update();
    };

    var updateField = function () {
        $scope.stage.removeAllChildren();
        var canvas = document.getElementById('forest-preview');
        if (canvas.getContext) {
            var ctx = canvas.getContext('2d');
            ctx.canvas.width = window.innerWidth;
            ctx.canvas.height = window.innerHeight - 100;
            //ctx.fillStyle = "rgb(200,0,0)";
            angular.forEach($scope.mapping, function (value, key) {
                var pusher = value;
                for (var i = pusher.length - 1; i >= 0; i--) {
                    var coords = getRelativeCoords(pusher[i].center, ctx);
                    var x = coords[0];
                    var y = coords[1];
                    var size = 20;
                    var dragger = new createjs.Container();
                    dragger.x = x;
                    dragger.y = y;
                    var circle = new createjs.Shape();
                    var color = clusterStyle[pusher[i].type].color;

                    var dia = clusterStyle[pusher[i].type].size;
                    circle.graphics.beginFill(color).drawCircle(0, 0, dia);
                    if (!(key in $scope.pushers)) {
                        dragger.alpha = 0.5;
                    }
                    dragger.mac_addr = key;
                    dragger.type = pusher[i].type;
                    dragger.strip_no = i;
                    dragger.rotation = pusher[i].rotation;
                    dragger.on("pressmove", treePressMove);
                    dragger.on("pressup", treePressUp);
                    dragger.on("click", treeClick);
                    circle.shadow = new createjs.Shadow("rgba(0,0,0,0.4)", 5, 5, 10);
                    var label = new createjs.Text(key.slice(2).toUpperCase() + " " + i, "bold 14px Verdana", "#FFFFFF");
                    label.textAlign = "center";
                    label.y = -7;
                    dragger.addChild(circle, label);
                    $scope.stage.addChild(dragger);
                }
            });
        }
        $scope.stage.update();
    };

    var clusterStyle = {
        cluster6: {
            color: "rgba(91,189,225,0.8)",
            size: 50
        },
        cluster8: {
            color: "rgba(0,35,200,0.8)",
            size: 60
        },
        densecluster8: {
            color: "rgba(255,0,0,0.8)",
            size: 90
        }
    };

    $scope.$on('socket:pusher mapping', function (ev, data) {
        $scope.mapping = data;
        updateField();
    });

    $scope.getPushers = function () {
        mySocket.emit('list pushers');
    };

    $scope.getMapping = function () {
        mySocket.emit('get mapping');
    };


    var getRelativeCoords = function (coords, ctx) {
        var w = ctx.canvas.width;
        var h = ctx.canvas.height;
        var x = (coords[0] * (w / 2)) + w / 2;
        var y = (coords[1] * (h / 2)) + h / 2;
        return [x, y];
    };

    $scope.pushers = {};
    $scope.getPushers();
    $scope.getMapping();

    $scope.stage = new createjs.Stage("forest-preview");

    document.onkeydown = keyPressed;

});
