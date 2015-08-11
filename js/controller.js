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

    var KEYCODE = {
        KEYR: 82,
        KEYM: 77,
        ESC: 27
    };

    var MODES = {
        DRAG: 0,
        ROTATE: 1,
        LB_MV: 2
    };

    var KEY_MODES = [];

    KEY_MODES[KEYCODE.KEYR] = MODES.ROTATE;
    KEY_MODES[KEYCODE.KEYM] = MODES.LB_MV;

    var lbSz = 200;

    $scope.editMode = MODES.DRAG;

    $scope.lastSelected = null;

    $scope.leds = [];

    var keyPressed = function (evt) {
        var code = evt.keyCode;
        if (code in KEY_MODES) {
            $scope.editMode = KEY_MODES[code];
        }
        switch (code) {
            case KEYCODE.ESC:
                unselectAll();
                $scope.editMode = MODES.DRAG;
                break;
        }
    };

    var unselectAll = function () {
        for (var child = 0; child < $scope.stage.children.length; child++) {
            var c = $scope.stage.children[child];
            c.dispatchEvent("cancel");
        }
    };

    var treeCancel = function (evt) {
        if (evt.currentTarget.saved_alpha == undefined) {
            return;
        }
        evt.currentTarget.selected = false;
        evt.currentTarget.alpha = evt.currentTarget.saved_alpha;
        $scope.stage.update();
    };

    var treeSelect = function (evt) {
        if ($scope.lastSelected != null) {
            $scope.lastSelected.dispatchEvent("cancel");
        }
        evt.currentTarget.selected = true;
        evt.currentTarget.saved_alpha = evt.currentTarget.alpha;
        evt.currentTarget.alpha = 1;
        $scope.lastSelected = evt.currentTarget;
        $scope.stage.update();
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
            recalculateOcclusion();
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
        //evt.currentTarget.dispatchEvent("cancel");
    };

    var treeClick = function (evt) {
        if (evt.currentTarget.selected == undefined || evt.currentTarget.selected == false) {
            evt.currentTarget.dispatchEvent("select");
        }
    };

    var recalculateOcclusion = function () {
        for (var led_idx = 0; led_idx < $scope.leds.length; led_idx++) {
            var led = $scope.leds[led_idx];
            var pt = led.localToGlobal(led.xpos, led.ypos);
            var bounds = $scope.lightDragger.getTransformedBounds();

            if (pt.x > bounds.x && pt.x < bounds.x + bounds.width && pt.y > bounds.y && pt.y < bounds.y + bounds.height) {
                //led.alpha = 0;
                led.graphics._fill.style = '#FFFFFF';
            } else {
                //led.alpha = 1;
                led.graphics._fill.style = '#000000';
            }
        }
    };

    var stageMouseMove = function (evt) {
        if ($scope.lightDragger == undefined) {
            return
        }
        if ($scope.editMode == MODES.LB_MV) {
            var x = evt.stageX;
            var y = evt.stageY;
            $scope.lightDragger.x = x;
            $scope.lightDragger.y = y;
            recalculateOcclusion();
            $scope.stage.update();
        }
    };

    var createLed = function (d, x, y, size) {
        var led = new createjs.Shape();


        led.graphics
            .beginFill("black")
            .drawRect(x - (size / 2), y - (size / 2), size, size);
        led.xpos = (x - (size / 2));
        led.ypos = (y - (size / 2));
        d.addChild(led);
        $scope.leds.push(led);
    }

    var createCluster = function (d, order, num_arms, pixel_spacing, pixel_size) {
        var inner_pixel_radius = 1.5 * pixel_spacing;
        for (var arm = 0; arm < num_arms; arm++) {
            var theta = (arm / num_arms) * (2 * Math.PI);
            for (var ord_idx = 0; ord_idx < order.length; ord_idx++) {
                var pixel_index = order[ord_idx];
                var distance_from_center = inner_pixel_radius + (pixel_index * pixel_spacing);
                var x = Math.cos(theta) * distance_from_center;
                var y = Math.sin(theta) * distance_from_center;
                createLed(d, x, y, pixel_size);
            }
        }
    };

    var createCluster6 = function (d) {
        var order = [0, 2, 3, 1];
        var num_arms = 6;
        var pixel_spacing = 12;
        var pixel_size = 5;
        createCluster(d, order, num_arms, pixel_spacing, pixel_size);
    };

    var createCluster8 = function (d) {
        var order = [0, 2, 1];
        var num_arms = 8;
        var pixel_spacing = 12;
        var pixel_size = 5;
        createCluster(d, order, num_arms, pixel_spacing, pixel_size);
    };

    var createDenseCluster8 = function (d) {
        var led_distance = 1;
        var pixel_size = 1;
        for (var rot = 0; rot < 8; rot++) {
            for (var dist = 0; dist < 120; dist++) {
                var x = (Math.cos(rot * Math.PI * 2 / 8) * led_distance * (dist + 10));
                var y = (Math.sin(rot * Math.PI * 2 / 8) * led_distance * (dist + 10));
                createLed(d, x, y, pixel_size);
            }
        }
    }

    var updateField = function () {
        $scope.stage.removeAllChildren();
        var canvas = document.getElementById('forest-preview');
        if (canvas.getContext) {
            var ctx = canvas.getContext('2d');
            ctx.canvas.width = window.innerWidth;
            ctx.canvas.height = window.innerHeight - 100;
            $scope.lightDragger = new createjs.Container();
            $scope.lightDragger.x = ctx.canvas.width / 2;
            $scope.lightDragger.y = ctx.canvas.height / 2;

            var lightBox = new createjs.Shape();
            lightBox.graphics
                .beginFill("rgba(255,255,255,0.4")
                .beginStroke("black")
                .drawRect(-lbSz / 2, -lbSz / 2, lbSz, lbSz);
            $scope.lightDragger.setBounds(-lbSz / 2, -lbSz / 2, lbSz, lbSz);
            $scope.lightDragger.addChild(lightBox);
            $scope.stage.addChild($scope.lightDragger);

            angular.forEach($scope.mapping, function (value, key) {
                var pusher = value;
                for (var i = pusher.length - 1; i >= 0; i--) {
                    var strip = pusher[i];
                    var coords = getRelativeCoords(strip.center, ctx);
                    var x = coords[0];
                    var y = coords[1];
                    var size = 20;
                    var dragger = new createjs.Container();
                    dragger.x = x;
                    dragger.y = y;
                    var circle = new createjs.Shape();
                    var style = clusterStyle[strip.type];
                    var color = style.color;

                    var dia = style.size;
                    circle.graphics.beginFill(color).drawCircle(0, 0, dia);
                    if (!(key in $scope.pushers)) {
                        dragger.alpha = 0.5;
                    }
                    dragger.mac_addr = key;
                    dragger.type = strip.type;
                    dragger.strip_no = i;
                    dragger.rotation = strip.rotation;
                    dragger.on("pressmove", treePressMove);
                    dragger.on("pressup", treePressUp);
                    dragger.on("click", treeClick);
                    dragger.on("cancel", treeCancel);
                    dragger.on("select", treeSelect);
                    circle.shadow = new createjs.Shadow("rgba(0,0,0,0.4)", 5, 5, 10);
                    var label = new createjs.Text(key.slice(2).toUpperCase() + " " + i, "bold 14px Verdana", "#FFFFFF");
                    label.textAlign = "center";
                    label.y = -7;
                    dragger.addChild(circle);
                    if (style.drawFn != undefined) {
                        style.drawFn(dragger);
                    }
                    dragger.addChild(label);
                    $scope.stage.addChild(dragger);
                }
            });
            $scope.stage.addChild($scope.lightDragger);
        }
        $scope.stage.update();
    };

    var clusterStyle = {
        cluster6: {
            color: "rgba(91,189,225,0.8)",
            size: 60,
            drawFn: createCluster6
        },
        cluster8: {
            color: "rgba(0,35,200,0.8)",
            size: 60,
            drawFn: createCluster8
        },
        densecluster8: {
            color: "rgba(255,0,0,0.8)",
            size: 130,
            drawFn: createDenseCluster8
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
    $scope.stage.on("stagemousemove", stageMouseMove);

    document.onkeydown = keyPressed;

})
;
