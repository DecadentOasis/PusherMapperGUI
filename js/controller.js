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

    $scope.viewport_w = 800;
    $scope.viewport_h = 600;

    $scope.$on('socket:error', function (ev, data) {
        console.log(data);
    });
    $scope.$on('socket:pushers', function (ev, data) {
        angular.forEach(data, function (value, key) {
            $scope.pushers[key] = value;
        });
        $scope.pushers = data;
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

    $scope.getStyle = function (center) {

        var w = $scope.getForestWidth();
        var h = $scope.getForestHeight();;
        var x = (center[0] * (w / 2)) + w / 2;
        var y = (center[1] * (h / 2)) + h / 2;
        return {'top': y + 'px', 'left': x + 'px'};
    }

    $scope.pushers = {};
    $scope.getPushers();
    $scope.getMapping();

});
