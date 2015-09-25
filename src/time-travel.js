import Cycle from '@cycle/core';
import TimedArray from './timedarray';

function assert(b, message) {
  if (!b) {
    throw new Error('Assertion failed: ' + message);
  }
}

function assertEvent(event) {
  assert(event);
  assert('type' in event, 'No type in event: ' + JSON.stringify(event));
  assert('time' in event, 'No time in event: ' + JSON.stringify(event));
  assert(typeof event.time === 'number');
  assert(typeof event.type === 'string');
  assert(['state', 'action', 'time'].indexOf(event.type) >= 0);
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
}

function makeTimeTravelDriver(options) {
  function debug(...args) {
    if (options.debug) {
      console.log.apply(console, args);
    }
  }
  return function timeTravelDriver(events$) {
    var timedStates = new TimedArray();
    var timedActions = new TimedArray();
    var lastTime = 0;

    var outputEvents = events$
      .do(debug.bind(null, '>'))
      .do(event => assertEvent(event))
      .flatMap(function(event) {
        var result;
        switch(event.type) {
          case 'time': result = handleTime(event); break;
          case 'state': result = handleState(event); break;
          case 'action': result = handleAction(event); break;
          default: throw ('Type ' + event.type + " not supported");
        }
        return result;
      })
      .do(debug.bind(null, '<'))
      .do(event => assertEvent(event))
      .share();

    function handleTime(event) {
      var newTime = event.time;
      debug('@', lastTime, 'handleTime', {time:event.time});
      if (newTime > lastTime) {
        // Traveling forward in time.
        // We need to output the state before the new time proceeded by
        // all actions that happened after that state (but before the new time).
        let timedState = timedStates.getAtOrBeforeTime(newTime);
        debug('timedState before ', newTime, ':', timedState);

        // If no state was found, then there are no states before the new time.
        // This is kind of an edge-case, because usually we do have a state at time 0.
        // We will output nothing.
        if (!timedState) {
          lastTime = newTime;
          debug('No state found before', newTime);
          return Cycle.Rx.Observable.empty();
        }

        // Retrieve the actions that happened after the timedState, but before our target time.
        var passedTimedActions = timedActions.sliceInterval({
          includeFirst: false,
          includeLast: true,
          first: timedState.time,
          last: newTime
        });

        let stateEvents = Cycle.Rx.Observable.of({type: 'state', time: timedState.time, state: timedState.state});
        let actionEvents = Cycle.Rx.Observable.fromArray(passedTimedActions)
            .take(1) // Only output the first action, as its state will be recalculated and send back.
            .map(timedAction => ({ type: 'action', time: timedAction.time, action: timedAction.action }));

        if (timedState.time <= lastTime) {
          // If the state was created before our travel started,
          // we don't have to output that state, since it is still in place.
          lastTime = newTime;
          return actionEvents;
        } else {
          return Cycle.Rx.Observable.concat(
            stateEvents,
            actionEvents
          );
        }
      } else if (newTime < lastTime) {
        // Traveling backwards in time.
        // We only need to output the state of the past.
        // We do not have to output any actions, because the actions between the past and now in the past.
        let timedState = timedStates.getAtOrBeforeTime(newTime);

        lastTime = newTime;
        return Cycle.Rx.Observable.of(timedState)
          .map(timedState => ({ type: 'state', time: timedState.time, state: timedState.state }));
      } else if (newTime === lastTime) {
        // No change in time. Nothing happens.
        return Cycle.Rx.Observable.empty();
      }
    }

    function handleState({state, time}) {
      debug('@', lastTime, 'handleState', {time, state});
      assert(typeof time === 'number');
      if (time > lastTime) {
        // State was created in the future.
        // Our current state with future actions should give us that same future state,
        // however to save us from recalculating this state, we will save it now.
        timedStates.insert({ time: time, state: state });
        return Cycle.Rx.Observable.empty();
      } else if (time < lastTime) {
        // State was created in the past.
        // We have to forget all succeeding states and regenerate states from the past
        // with the actions that occurred after this created state.
        timedStates.removeAtOrAfter(time);
        timedStates.insert({ time: time, state: state });
        var pendingActions = timedActions.sliceInterval({
          includeFirst: false, includeLast: true,
          first: time,
          last: lastTime
        });
        debug(pendingActions.length, 'actions to process');
        if (pendingActions.length === 0) {
          return Cycle.Rx.Observable.of({ type: 'state', time: time, state: state })
        } else {
          var nextPendingAction = pendingActions[0];
          return Cycle.Rx.Observable.concat(
            Cycle.Rx.Observable.of({ type: 'state', time: time, state: state }),
            Cycle.Rx.Observable.just({ type: 'action', time: nextPendingAction.time, action: nextPendingAction.action })
          );
        }
      } else if (time === lastTime) {
        // New state was created for our current time.
        // Output it like usual.
        timedStates.insert({ state: state, time: time });
        return Cycle.Rx.Observable.of({ type: 'state', time: time, state: state });
      } else {
        throw "This cannot happen";
      }
    }

    function handleAction({action, time}) {
      debug('@', lastTime, 'handleAction', {time,action});
      if (time > lastTime) {
        // Action occured now or in the future.
        // Future actions do not have impact on our current state.
        // Just insert the action for future use.

        timedActions.insert({ time: time, action: action });
        return Cycle.Rx.Observable.empty();
      } else if (time < lastTime) {
        // Action occured in the past.
        // We need to recreate our current state with the past action mixed in.
        timedActions.insert({ time: time, action: action });
        var pastTimedState = timedStates.getAtOrBeforeTime(time);
        var pastTimedActions = timedActions.sliceAtUntil(time, lastTime)
          .map(timedAction => ({ type: 'action', time: timedAction.time, action: timedAction.action }));
        return Cycle.Rx.Observable.concat(
          Cycle.Rx.Observable.of({ type: 'state', time: pastTimedState.time, state: pastTimedState.state }),
          Cycle.Rx.Observable.fromArray(pastTimedActions)
        );
      } else {
        timedActions.insert({ time: time, action: action });
        return Cycle.Rx.Observable.of({ type: 'action', time: time, action: action });
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