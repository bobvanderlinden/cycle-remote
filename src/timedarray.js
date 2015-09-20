"use strict"
class TimedArray extends Array {
  insertAll(arr) {
    arr.forEach(this.insert.bind(this));
  }
  getAtOrBeforeTime(time) {
    return this[this.indexAtOrBeforeTime(time)];
  }
  getAtOrAfterTime(time) {
    return this[this.indexAtOrAfterTime(time)];
  }
  getBeforeTime(time) {
    return this[this.indexBeforeTime(time)];
  }
  getAfterTime(time) {
    return this[this.indexAfterTime(time)];
  }
  indexAtOrBeforeTime(time) {
    var i;
    for(i=-1;i<this.length-1 && this[i+1].time <= time;i++) { }
    return i;
  }
  indexAtOrAfterTime(time) {
    var i;
    for(i=0;i<this.length && this[i].time < time;i++) { }
    if (i >= this.length) { return -1; }
    return i;
  }
  indexAfterTime(time) {
    var i;
    for(i=0;i<this.length && this[i].time <= time;i++) { }
    if (i >= this.length) { return -1; }
    return i;
  }
  indexBeforeTime(time) {
    var i;
    for(i=-1;i<this.length-1 && this[i+1].time < time;i++) { }
    return i;
  }
  sliceAtUntil(timeAt, timeUntil) {
    if (timeAt > timeUntil) { throw new Error('timeAt is greater than timeUntil')}
    var fromIndex = this.indexAtOrAfterTime(timeAt);
    var untilIndex = this.indexBeforeTime(timeUntil);
    if (fromIndex === -1) {
      return [];
    }
    return this.slice(fromIndex, untilIndex + 1);
  }
  isEmpty() {
    return this.length === 0;
  }
  insert(item) {
    let index = this.indexAtOrAfterTime(item.time);
    if (index > -1 && this[index].time === item.time) {
      throw new Error('Attempt to insert duplicate time');
    }
    if (index === -1) { index = this.length; }
    this.splice(index, 0, item);
    return index;
  }
  removeFromIndex(index) {
    return this.splice(index, this.length);
  }
  getFirstTime() {
    return this.isEmpty() ? null : this[0].time;
  }
  getLastTime() {
    return this.isEmpty() ? null : this[this.length - 1].time;
  }
  isPrehistoric(time) {
    return time < this.getFirstTime();
  }
  toArray() {
    return this.slice(0);
  }
}

module.exports = TimedArray;