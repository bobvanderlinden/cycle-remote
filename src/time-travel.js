import Cycle from '@cycle/core';
import TimedArray from './timedarray';

function assert(b) {
  if (!b) {
    throw new Error('Assertion failed');
  }
}

function makeTimeTravelDriver() {
  return function timeTravelDriver(events$) {
    var timedStates = new TimedArray();
    var timedActions = new TimedArray();
    var lastTime = 0;

    var outputEvents = events$
      .flatMap(function(event) {
        switch(event.type) {
          case 'time': return handleTime(event);
          case 'state': return handleState(event);
          case 'action': return handleAction(event);
          default: throw (event.type + " not supported");
        }
      })
      .do(event => {
        assert('type' in event);
        assert('time' in event);
        assert(typeof event.time === 'number');
        assert(typeof event.type === 'string');
        switch(event.type) {
          case 'state':
            assert('state' in event);
            break;
          case 'action':
            assert('action' in event);
            break;
          case 'time':
            break;
          default: assert(false);
        }
      })
      .share();

    function handleTime(event) {
      var newTime = event.time;

      if (newTime > lastTime) {
        // Traveling forward in time.
        // We need to output all passed actions.
        // We do not have to output any states, because this will result from the actions being handled.
        var passedTimedActions = timedActions.sliceAtUntil(lastTime, newTime);

        lastTime = newTime;
        return Cycle.Rx.Observable.fromArray(passedTimedActions).map(timedAction => ({ type: 'action', action: timedAction.action, time: timedAction.time }));
      } else if (newTime < lastTime) {
        // Traveling backwards in time.
        // We only need to output the state of the past.
        // We do not have to output any actions, because the actions between the past and now in the past.
        timedState = timedStates.getAtOrBeforeTime(newTime);

        lastTime = newTime;
        return Cycle.Rx.Observable.of(timedStates[newStateIndex]).map(timedState => ({ type: 'state', state: timedState.state, time: timedState.time }));
      } else if (newTime === lastTime) {
        // No change in time. Nothing happens.
        return Cycle.Rx.Observable.empty();
      }
    }

    function handleState({state, time}) {
      if (time > lastTime) {
        // State was created in the future.
        // Our future actions should give us that same future state, so
        // we may forget about this future state.
        return Cycle.Rx.Observable.empty();
      } else if (time < lastTime) {
        // State was created in the past.
        // We have to forget all succeeding states and regenerate states from the past
        // with the actions that occurred after this created state.
        timedStates.removeAtOrAfter(time);
        timedStates.insert({ state: state, time: time });
        var actions = timedActions.sliceAtUntil(time, lastTime);
        return Cycle.Rx.Observable.concat(
          Cycle.Rx.Observable.of({ type: 'state', state: state, time: time }),
          Cycle.Rx.Observable.fromArray(actions)
        );
      } else if (time === lastTime) {
        // New state was created for our current time.
        // Output it like usual.
        return Cycle.Rx.Observable.of({ type: 'state', state: state, time: time });
      }
    }

    function handleAction({action, time}) {
      if (time >= lastTime) {
        // Action occured now or in the future.
        // Future actions do not have impact on our current state.
        // Just insert the action for future use.

        // TODO: Maybe actions 'now' should be handled directly.
        
        timedActions.insert({ action: action, time: time });
        return Cycle.Rx.Observable.empty();
      } else if (time < lastTime) {
        // Action occured in the past.
        // We need to recreate our current state with the past action mixed in.
        timedActions.insert({ action: action, time: time });
        var pastTimedState = timedStates.getAtOrBeforeTime(time);
        var pastTimedActions = timedActions.sliceAtUntil(time, lastTime)
          .map(timedAction => Object.assign({ type: 'action' }, timedAction));
        return Cycle.Rx.Observable.concat(
          Cycle.Rx.Observable.of(Object.assign({ type: 'state' }, pastTimedState)),
          Cycle.Rx.Observable.fromArray(pastTimedActions)
        );
      }
    }

    return {
      outputEvents,
      state: outputEvents.filter(event => event.type === 'state').map(event => event.state),
      action: outputEvents.filter(event => event.type === 'action').map(event => event.action)
    };
  };
}

module.exports = {
  makeTimeTravelDriver
};