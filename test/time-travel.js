import Cycle from '@cycle/core';
import {makeTimeTravelDriver} from '../src/time-travel';
var assert = require('assert');

Cycle.Rx.config.longStackSupport = true;

var Rx = Cycle.Rx;
var onNext = Rx.ReactiveTest.onNext;
var onCompleted = Rx.ReactiveTest.onCompleted;
var subscribe = Rx.ReactiveTest.subscribe;

function state(time, value) {
  return {
    type: 'state',
    time: time,
    state: value
  };
}

function action(time, value) {
  return {
    type: 'action',
    time: time,
    action: value
  };
}

function time(time) {
  return {
    type: 'time',
    time: time
  };
}

function rxDeepEqual(a,b) {
  function toJson(notification) {
    switch(notification.value.kind) {
      case 'N':
        return {
          kind: 'N',
          time: notification.time,
          value: notification.value.value
        };
      case 'E':
        console.log(notification.value.exception.stack);
        return {
          kind: 'E',
          time: notification.time,
          exception: notification.value.exception
        };
      case 'C':
        return {
          kind: 'C',
          time: notification.time
        };
      default:
        throw new Error('Should not happen');
    }
  }
  assert.deepEqual(a.map(toJson), b.map(toJson));
}

function testTimeTravel(options, notifications, expected) {
    var scheduler = new Cycle.Rx.TestScheduler();
    var inputEvents = scheduler.createHotObservable(notifications);

    var res = scheduler.startWithTiming(function () {
      let {outputEvents} = makeTimeTravelDriver(options)(inputEvents);
      return outputEvents;
    }, 0, 0, 1000);

    rxDeepEqual(res.messages, expected);
}

describe('TimeTravel', function() {
  it('does not output time events', function() {
    testTimeTravel({},[
      onNext(30, time(100))
    ], []);
  });

  it('outputs state that has just been created', function() {
    testTimeTravel({}, [
      onNext(10, time(100)),
      onNext(20, state(100, 1))
    ], [
      onNext(20, state(100, 1))
    ]);
  });

  it('outputs state that was created in the past', function() {
    testTimeTravel({}, [
      onNext(10, time(100)),
      onNext(20, state(0, 1))
    ], [
      onNext(20, state(0, 1))
    ]);
  });

  // TODO: This test is not realistic: states created in future are strange.
  it('outputs latest state when traveling to future', function() {
    testTimeTravel({}, [
      onNext(40, time(0)),
      onNext(30, state(10, 1)),
      onNext(40, time(100))
    ], [
      onNext(40, state(10, 1))
    ]);
  });

  // TODO: This test is not realistic: states created in future are strange.
  it('outputs state at exact time when traveling to future', function() {
    testTimeTravel({}, [
      onNext(40, time(0)),
      onNext(30, state(10, 1)),
      onNext(40, time(10))
    ], [
      onNext(40, state(10, 1))
    ]);
  });

  it('outputs latest state and passed actions when traveling to future', function() {
    testTimeTravel({}, [
      onNext(20, state(0, 1)),
      onNext(30, action(1, 1)),
      onNext(40, action(2, 2)),
      onNext(50, time(100))
    ], [
      onNext(20, state(0, 1)),
      onNext(50, action(1, 1)),
    ]);
  });

  it('outputs latest state and passed actions when traveling to future', function() {
    testTimeTravel({}, [
      onNext(20, state(0, 1)),
      onNext(30, action(1, 1)),
      onNext(40, action(2, 2)),
      onNext(50, time(100))
    ], [
      onNext(20, state(0, 1)),
      onNext(50, action(1, 1)),
    ]);
  });

  it('should be able to jump through time', function() {
    testTimeTravel({}, [
      // Building the actions/states
      onNext(20, state(0, 1)),
      onNext(30, action(10, 1)),
      onNext(40, action(20, 2)),
      onNext(50, time(100)),
      onNext(51, state(10, 2)),
      onNext(52, state(20, 4)),

      // Jumping through time.
      onNext(60, time(15)),
      onNext(70, time(10)),
      onNext(80, time(100)),
    ], [
      onNext(20, state(0, 1)),
      onNext(50, action(10, 1)),
      onNext(51, state(10, 2)),
      onNext(51, action(20, 2)),
      onNext(52, state(20, 4)),
      onNext(60, state(10, 2)),
      onNext(70, state(10, 2)),
      onNext(80, state(20, 4))
    ]);
  });

  it('normal non-time-traveling', function() {
    testTimeTravel({}, [
      onNext(20, state(0, 1)),
      onNext(110, time(1)),
      onNext(112, action(1, 1)),
      onNext(113, state(1, 2)),
      onNext(120, time(2)),
      onNext(130, time(3)),
      onNext(138, action(3, 1)),
      onNext(139, state(3, 3)),
      onNext(140, time(4)),
      onNext(150, time(5)),
      onNext(151, action(5, 1)),
      onNext(152, state(5, 4)),
      onNext(160, time(6)),
      onNext(190, time(100))
    ], [
      onNext(20, state(0, 1)),
      onNext(112, action(1, 1)),
      onNext(113, state(1, 2)),
      onNext(138, action(3, 1)),
      onNext(139, state(3, 3)),
      onNext(151, action(5, 1)),
      onNext(152, state(5, 4))
    ]);
  });


  it('#fsddf', function() {
    return;
    function updateState({state}, {action, time}) {
      return state + action;
    }

    var initialState = 0;

    var subject = new Rx.BehaviorSubject(state(0, initialState));

    var events$ = scheduler.createColdObservable(
      onNext(20, time(11)),
      onNext(10, state(0, 0)),
      onNext(20, action(10, 1))
    ).merge(subject)
    .do(event => console.log('> event', JSON.stringify(event)));

    let {outputEvents} = makeTimeTravelDriver()(events$);

    outputEvents = outputEvents
      .do(event => console.log('< event', JSON.stringify(event)))
      .share();

    let outputActions = outputEvents
      .filter(event => event.type === 'action');
    let outputStates = outputEvents
      .filter(event => event.type === 'state');

    Cycle.Rx.Observable.combineLatest([outputStates, outputActions], function({stateTime,state}, {time,action}) {
      assert(stateTime <= time);

      let newState = updateState(state, action);
      return {
        type: 'state',
        state: newState,
        time: time
      };
    })
    .do(state => console.log('state', state))
    .subscribe(subject);

    var res = scheduler.startWithCreate(function () {
      return outputEvents.merge(subject);
    });

    res.messages.filter(message => message.value.kind === 'E').forEach(message => console.log('message', message.value.exception.stack));

    res.messages.map(message => message.value).forEach(message => console.log(message.kind, message.value));

    assert.equal(res.messages, []);
  });
});
