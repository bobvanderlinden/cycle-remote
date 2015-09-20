import Cycle from '@cycle/core';
import {makeTimeTravelDriver} from '../src/time-travel';
var assert = require('assert');

var Rx = Cycle.Rx;
var onNext = Rx.ReactiveTest.onNext;
var onCompleted = Rx.ReactiveTest.onCompleted;
var subscribe = Rx.ReactiveTest.subscribe;

function state(time, value) {
  return {
    type: 'state',
    state: value,
    time: time
  };
}

function action(time, value) {
  return {
    type: 'action',
    action: value,
    time: time
  };
}

function time(time) {
  return {
    type: 'time',
    time: time
  };
}

var sequenceA = [
  state(1, 0),
  action(1, 1),
  action(2, 1),
  action(3, 1)
];

var scheduler = new Cycle.Rx.TestScheduler();

describe('TimeTravel', function() {
  it('#fsddf', function() {
    var i =0;
    var events$ = scheduler.createColdObservable(
      onNext(0, time(0)),
      onNext(10, state(0, 0)),
      onNext(20, action(10, 1)),
      onNext(50, time(5))
    );

    let {outputEvents} = makeTimeTravelDriver()(events$);

    var res = scheduler.startWithCreate(function () {
      return outputEvents;
    });

    console.log(res.messages.map(message => message.value.value));
    assert.equal(1, 2);
  });
});
