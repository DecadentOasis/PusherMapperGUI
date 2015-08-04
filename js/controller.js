var app = angular.module('PusherMapperGUI', [
  'btford.socket-io'
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
  $scope.$on('socket:pushers', function(ev, data) {
    angular.forEach(data, function(value, key) {
      $scope.pushers[key] = value;
    });
    $scope.pushers = data;
  });

  $scope.$on('socket:pusher mapping', function(ev, data) {
    $scope.mapping = data;
  });

  $scope.getPushers = function() {
    mySocket.emit('list pushers');
  };

  $scope.getMapping = function() {
    mySocket.emit('get mapping');
  };

  $scope.pushers = {};
  $scope.getPushers();
  $scope.getMapping();
});
