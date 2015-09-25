const {Rx} = require('@cycle/core');

function getCurrentTime () {
  return new Date().getTime();
}

function makeAbsoluteTime() {
  return Rx.Observable.interval(16)
    .map(function(_) {
      return getCurrentTime();
    })
    .startWith(0);
}

function makeRelativeTime() {
  return Rx.Observable.interval(16)
    .scan((time, next) => time + 1, 0);
}

module.exports = {
  makeTime: makeRelativeTime
};