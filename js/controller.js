var app = angular.module('PusherMapperGUI', [
  'btford.socket-io'
]);
app.factory('mySocket', function (socketFactory) {
  var mySocket = socketFactory();
  mySocket.forward('error');
  mySocket.forward('pushers');
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

  $scope.getPushers = function() {
    mySocket.emit('list pushers');
  };

  $scope.pushers = {};
  $scope.getPushers();
});
