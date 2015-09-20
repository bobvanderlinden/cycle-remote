import Cycle from '@cycle/core';

function makeWebSocket(url) {
  return function webSocketDriver(outgoingMessages){
    return Cycle.Rx.Observable.create(function(observer) {
      let websocket = new WebSocket(url);
      var outgoingSubscription;

      websocket.onopen = function() {
        outgoingSubscription = outgoingData.subscribe(outgoingDataObserver);
      };
      websocket.onmessage = function(event) {
        let message = JSON.parse(event.data);
        console.log('received', message);
        observer.onNext(message);
      };

      websocket.onerror = function(err) {
        observer.onError(err);
      };

      websocket.onclose = function(event) {
        if (event.code === 1000) {
          observer.onCompleted();
        } else {
          observer.onError({
            code: event.code,
            reason: event.reason
          });
        }
      };

      let outgoingData = outgoingMessages
          .do(event => console.log('send', event))
          .map(message => JSON.stringify(message));
      let outgoingDataObserver = Cycle.Rx.Observer.create(
        function(data) {
          websocket.send(data);
        },
        function(err) {
          console.error(err);
          websocket.close(1001, 'Error');
        },
        function() {
          websocket.close(1000, 'Bye');
        });
    });
  };
}

module.exports = {
  makeWebSocket: makeWebSocket
};