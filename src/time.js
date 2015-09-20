const {Rx} = require('@cycle/core');

function getCurrentTime () {
  return new Date().getTime();
}

function makeTime() {
  return Rx.Observable.interval(16)
    .map(function(_) {
      return getCurrentTime();
    })
    .startWith(0);
}

module.exports = {
  makeTime
};