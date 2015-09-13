import Cycle from '@cycle/core';
import {h, makeDOMDriver} from '@cycle/dom';

function makeWebSocket(url, outgoingMessages) {
  return Cycle.Rx.Observable.create(function(observer) {
    let websocket = new WebSocket(url);
    var outgoingSubscription;

    websocket.onopen = function() {
      outgoingSubscription = outgoingData.subscribe(outgoingDataObserver);
    };
    websocket.onmessage = function(event) {
      let message = JSON.parse(event.data);
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
}

function makeRemoteDriver(url, initialState, updateState) {
  // TODO: Remove initialState and updateState from here.
  //       A nicer API would output states and actions, so
  //       that the main function can respond to this like it
  //       does for offline applications.
  return function remoteDriver(localActions) {

    // This is where we store historic actions, each
    // with their associated time when the action occurred.
    var storedActions = [];

    // This is where we store historic states, each
    // with their associated time when the state was fabricated.
    // Except for the initial state.
    var storedStates = [{ time: 0, state: initialState }];

    // TODO: Make a way to forget pre-historic actions and states.

    // Add time to local actions.
    let localTimedActions = localActions
      .map(action => ({
        time: new Date().getTime(),
        action: action
      }));

    // Create websocket and send local actions to server.
    // The server will broadcast actions to other peers.
    let websocket = makeWebSocket(url, localTimedActions);
    let remoteTimedActions = websocket;
    let timedActions = Cycle.Rx.Observable.merge(
      localTimedActions,
      remoteTimedActions
    );

    function getIndexAtTime(time, array) {
      var i=0;
      while(i < array.length && array[i].time <= time) {
        i++;
      }
      return i;
    }

    var states = new Cycle.Rx.BehaviorSubject(initialState);

    timedActions.forEach(function(timedAction) {
      var actionIndex = getIndexAtTime(timedAction.time, storedActions);

      // Insert the new action into storedActions at the right index/time.
      storedActions.splice(actionIndex, 0, timedAction);

      // Find the state on which the action has occured.
      let stateIndex = getIndexAtTime(timedAction.time, storedStates) - 1;
      var storedState = storedStates[stateIndex];
      console.log('stateIndex',stateIndex);
      console.log('storedState',storedState);

      // Deprecate states that were created after the action occured.
      storedStates.splice(stateIndex + 1);

      // Simulate the storedAction and all actions that occured after that.
      // Store the resulting states, which we can reuse later.
      for(;actionIndex < storedActions.length; actionIndex++) {
        let storedAction = storedActions[actionIndex];
        let newState = updateState(storedState.state, storedAction.action);
        storedState = {
          time: storedAction.time,
          state: newState
        };
        storedStates.push(storedState);
      }

      // Publish the resulting state.
      states.onNext(storedState.state);
    });

    return {
      state: states
    };
  };
}

function main({DOM,Remote}) {

  let action$ = Cycle.Rx.Observable.merge(
    DOM.select('.decrement').events('click').map(ev => -1),
    DOM.select('.increment').events('click').map(ev => +1)
  );
  let state$ = Remote.state;
  return {
    DOM: state$.map(count =>
        h('div', [
          h('button.decrement', 'Decrement'),
          h('button.increment', 'Increment'),
          h('p', 'Counter: ' + count)
        ])
      ),
    Remote: action$
  };
}

Cycle.run(main, {
  DOM: makeDOMDriver('#main-container'),
  Remote: makeRemoteDriver('ws://' + window.location.host, 0, (x,y) => {
    console.log('update', x,y);
    return x+y;
  })
});
