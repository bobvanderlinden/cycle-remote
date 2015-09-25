import Cycle from '@cycle/core';
import {h, makeDOMDriver} from '@cycle/dom';
import {makeWebSocket} from './websocket';
import {makeTimeTravelDriver} from './time-travel';
import {makeTime} from './time';

Cycle.Rx.config.longStackSupport = true;

function packEvents({time, state, action}) {
  return Cycle.Rx.Observable.merge(
    time.map(time => ({ type: 'time', time: time })),
    state.withLatestFrom(time, (state, time) => ({ type: 'state', state: state, time: time })),
    action.withLatestFrom(time, (action, time) => ({ type: 'action', action: action, time: time }))
  ).share();
}

function unpackEvents(events) {
  let sharedEvents = events.share();
  return {
    time: sharedEvents
      .filter(event => event.type === 'time')
      .map(event => event.time),
    state: sharedEvents
      .filter(event => event.type === 'state')
      .map(event => event.state),
    action: sharedEvents
      .filter(event => event.type === 'action')
      .map(event => event.action)
  };
}

function main({DOM, TimeTravel,Time}) {
  let localAction$ = Cycle.Rx.Observable.merge(
    DOM.select('.decrement').events('click').map(ev => -1),
    DOM.select('.increment').events('click').map(ev => +1)
  ).do(action => console.log('localAction$', action));

  let stateEvents$ = TimeTravel.handleActions(function(state, action) {
      return state + action;
    })
    .do(state => console.log('local state', state))
    .share();

  let localEvent$ = packEvents({
    time: Time,
    action: localAction$,
    state: Cycle.Rx.Observable.empty()
  })
  .startWith({ type: 'state', time: 0, state: 0 })
  .merge(stateEvents$);

  // Create websocket and send local actions to server.
  // The server will broadcast actions to other peers.
  let remoteEvent$ = makeWebSocket('ws://' + window.location.host)(localEvent$.filter(event => event.type === 'action'))
    .do(event => console.log('remote action', event));

  let state$ = TimeTravel.viewState;

  return {
    DOM: Cycle.Rx.Observable.combineLatest(state$, Time, (count, time) => ({count,time}))
      .map(({count,time}) =>
        h('div', [
          h('button.decrement', 'Decrement'),
          h('button.increment', 'Increment'),
          h('p', 'Counter: ' + JSON.stringify(count)),
          h('p', 'Time: ' + time)
        ])
      ),
    TimeTravel: Cycle.Rx.Observable.merge(localEvent$, remoteEvent$)
  };
}

Cycle.run(main, {
  DOM: makeDOMDriver('#main-container'),
  TimeTravel: makeTimeTravelDriver({}),
  Time: makeTime
});
