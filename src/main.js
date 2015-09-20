import Cycle from '@cycle/core';
import {h, makeDOMDriver} from '@cycle/dom';
import {makeWebSocket} from './websocket';
import {makeTimeTravelDriver} from './time-travel';
import {makeTime} from './time';

Cycle.Rx.config.longStackSupport = true;

function makeRemoteDriver(url) {
  return function remoteDriver(localEvents, driverName) {
    // TODO: Make a way to forget pre-historic actions and states.

    var localActionEvents = localEvents
      .filter(event => event.type === 'action')
      .share()
      .do(event => console.log('local action', event));

    // Create websocket and send local actions to server.
    // The server will broadcast actions to other peers.
    let websocket = makeWebSocket(url)(localActionEvents);
    let remoteActionEvents = websocket.do(event => console.log('remote action', event));

    var events = Cycle.Rx.Observable.merge(
      localEvents,
      remoteActionEvents
    ).share();

    var timeTravelDriver = makeTimeTravelDriver()(events);

    return {
      state: timeTravelDriver.state,
      action: timeTravelDriver.action,
      packEvents: function(time, state, actions) {
        return Cycle.Rx.Observable.merge(
          time.map(time => ({ type: 'time', time: time })),
          state.withLatestFrom(time, (state, time) => ({ type: 'state', state: state, time: time })),
          actions.withLatestFrom(time, (action, time) => ({ type: 'action', action: action, time: time }))
        ).share();
      }
    };
  };
}

function main({DOM,Remote,Time}) {
  let localAction$ = Cycle.Rx.Observable.merge(
    DOM.select('.decrement').events('click').map(ev => -1),
    DOM.select('.increment').events('click').map(ev => +1)
  ).do(action => console.log('localAction$', action));

  let localState$ = Remote.action
    .startWith(0)
    .scan((x,y) => x+y)
    .do(state => console.log('local state', state));

  let state$ = Remote.state
    .do(state => console.log('state ', state));
  return {
    DOM: state$.map(count =>
        h('div', [
          h('button.decrement', 'Decrement'),
          h('button.increment', 'Increment'),
          h('p', 'Counter: ' + count)
        ])
      ),
    Remote: Remote.packEvents(Time, localState$, localAction$)
  };
}

Cycle.run(main, {
  DOM: makeDOMDriver('#main-container'),
  Remote: makeRemoteDriver('ws://' + window.location.host),
  Time: makeTime
});
