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

app.controller('IndexCtrl', function ($scope, $mdDialog, mySocket) {

    $scope.$on('socket:error', function (ev, data) {
        console.log(data);
    });
    $scope.$on('socket:pushers', function (ev, data) {
        $scope.pushers = data;
        updateField();

    });

    var KEYCODE = {
        KEYR: 82,
        KEYM: 77,
        KEYD: 68,
        KEYA: 65,
        KEYP: 80,
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
    $scope.modeDesc = 'drag';

    $scope.lastSelected = null;

    $scope.leds = [];

    var keyPressed = function (evt) {
        var code = evt.keyCode;
        if (code in KEY_MODES) {
            $scope.editMode = KEY_MODES[code];
        } else {
            console.log('Unknown keycode: %s', code);
        }
        switch (code) {
            case KEYCODE.ESC:
                unselectAll();
                $scope.editMode = MODES.DRAG;
                $scope.modeDesc = 'drag';
                break;
            case KEYCODE.KEYD:
                deleteTree();
                break;
            case KEYCODE.KEYA:
                $scope.showAddTreeDialog(evt);
                break;
            case KEYCODE.KEYP:
                createjs.Ticker.paused = !createjs.Ticker.paused;
                break;
        }
        $scope.$apply(function () {
            if (createjs.Ticker.paused) {
                $scope.status = 'paused';
            } else {
                $scope.status = 'active';
            }

        });
    };

    var unselectAll = function () {
        for (var child = 0; child < $scope.stage.children.length; child++) {
            var c = $scope.stage.children[child];
            c.dispatchEvent("cancel");
        }
    };

    var deleteTree = function () {
        var mac_addr = $scope.lastSelected.mac_addr;
        var strip_no = $scope.lastSelected.strip_no;
        mySocket.emit('delete tree', mac_addr, strip_no);
        $scope.getMapping();
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
            //recalculateOcclusion();
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
            //recalculateOcclusion();
            $scope.stage.update();
        }
    };

    var createLed = function (d, x, y, size, pixel_no) {
        var led = new createjs.Shape();


        led.graphics
            .beginFill("black")
            .drawRect(x - (size / 2), y - (size / 2), size, size);
        led.xpos = (x - (size / 2));
        led.ypos = (y - (size / 2));
        led.pixel_no = pixel_no;
        d.addChild(led);
        $scope.leds.push(led);
    };

    var createCluster = function (d, order, num_arms, pixel_spacing, pixel_size) {
        var pixel_no = 0;
        var inner_pixel_radius = 1.5 * pixel_spacing;
        for (var arm = 0; arm < num_arms; arm++) {
            var theta = (arm / num_arms) * (2 * Math.PI);
            for (var ord_idx = 0; ord_idx < order.length; ord_idx++) {
                var pixel_index = order[ord_idx];
                var distance_from_center = inner_pixel_radius + (pixel_index * pixel_spacing);
                var x = Math.cos(theta) * distance_from_center;
                var y = Math.sin(theta) * distance_from_center;
                createLed(d, x, y, pixel_size, pixel_no);
                pixel_no++;
            }
        }
    };

    var createCluster6 = function (d) {
        var order = [0, 2, 3, 1];
        var num_arms = 6;
        var pixel_spacing = 8;
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
        var pixel_no = 0;
        for (var rot = 0; rot < 8; rot++) {
            for (var dist = 0; dist < 120; dist++) {
                var x = (Math.cos(rot * Math.PI * 2 / 8) * led_distance * (dist + 10));
                var y = (Math.sin(rot * Math.PI * 2 / 8) * led_distance * (dist + 10));
                createLed(d, x, y, pixel_size, pixel_no);
                pixel_no++;
            }
        }
    };

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
                    if (strip.ignore) {
                        continue;
                    }
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
            size: 40,
            drawFn: createCluster6
        },
        cluster8: {
            color: "rgba(0,35,200,0.8)",
            size: 50,
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

    createjs.Ticker.setInterval(50);
    createjs.Ticker.addEventListener("tick", handleTick);
    createjs.Ticker.paused = true;
    $scope.status = 'paused';

    function handleTick(event) {
        // Actions carried out each tick (aka frame)
        recalculateOcclusion();
        if (!event.paused) {
            var ledColors = {};
            for (var led_idx = 0; led_idx < $scope.leds.length; led_idx++) {
                var led = $scope.leds[led_idx];
                var mac_addr = led.parent.mac_addr;
                var stripNo = led.parent.strip_no;
                var pixelNo = led.pixel_no;
                if (!(mac_addr in ledColors)) {
                    ledColors[mac_addr] = [];
                }
                if (!(stripNo in ledColors[mac_addr])) {
                    ledColors[mac_addr][stripNo] = [];
                }
                var c = tinycolor(led.graphics._fill.style);
                var rgb = c.toRgb();
                ledColors[mac_addr][stripNo][pixelNo] = [rgb.r, rgb.g, rgb.b];

            }
            mySocket.emit("sc", ledColors);

        }
    }

    $scope.showAddTreeDialog = function (ev) {
        $mdDialog.show({
            controller: DialogController,
            templateUrl: 'html/add_tree.tmpl.html',
            parent: angular.element(document.body),
            targetEvent: ev,
            clickOutsideToClose: true
        })
            .then(function (answer) {
                //
            }, function () {
                //
            });
    };
});

app.filter('range', function () {
    return function (input, total) {
        total = parseInt(total);
        for (var i = 0; i < total; i++)
            input.push(i);
        return input;
    };
});

app.filter('non_ignored', function () {
    return function (input, scope) {
        var retn = [];
        if (scope.$parent.mapping == undefined) {
            return;
        }
        if (!(scope.key in scope.$parent.mapping)) {
            retn = input;
        }
        for (var strip_no = 0; strip_no < input.length; strip_no++) {
            if (strip_no in scope.$parent.mapping[scope.key]) {
                var mapping = scope.$parent.mapping[scope.key];
                if ((mapping.type == undefined || mapping.center == undefined)
                    && (mapping.ignore != undefined || mapping.ignore == false)) {
                    retn.push(input[strip_no]);
                } else {
                    continue;
                }
            }
            retn.push(input[strip_no]);
        }
        return retn;

    };
});

function DialogController($scope, $mdDialog, mySocket) {
    $scope.$on('socket:pushers', function (ev, data) {
        $scope.pushers = data;
        console.log(data);

    });
    $scope.$on('socket:pusher mapping', function (ev, data) {
        $scope.mapping = data;
    });

    $scope.getPushers = function () {
        mySocket.emit('list pushers');
    };

    $scope.getMapping = function () {
        mySocket.emit('get mapping');
    };

    $scope.ignore = function (mac_addr, strip_no) {
        mySocket.emit('ignore strip', mac_addr, strip_no);
        $scope.getMapping();
    };

    $scope.light = function (mac_addr, strip_no) {

    };

    $scope.hide = function () {
        $mdDialog.hide();
    };
    $scope.cancel = function () {
        $mdDialog.cancel();
    };
    $scope.answer = function (answer) {
        $mdDialog.hide(answer);
    };
    $scope.pushers = {};
    $scope.getPushers();
    $scope.getMapping();
}