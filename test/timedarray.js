var assert = require('assert');

var TimedArray = require('../src/timedarray');

var arrayA = [
  { time: 0 },
  { time: 10 },
  { time: 20 },
  { time: 30 },
  { time: 40 },
  { time: 50 }
];

describe('TimedArray', function() {
  describe('#isEmpty()', function() {
    it('should return true when no items are added', function() {
      assert.equal(true, new TimedArray().isEmpty());
    });
    it('should return false when a item is added', function() {
      var timedArray = new TimedArray();
      timedArray.insert(arrayA[0]);
      assert.equal(false, timedArray.isEmpty());
    });
  });

  describe('#insert()', function() {
    it('should add a single item', function() {
      var timedArray = new TimedArray();
      timedArray.insert(arrayA[0]);
      assert.equal(1, timedArray.length);
      assert.deepEqual(timedArray.toArray(), [arrayA[0]]);
    });

    it('should add multiple items in order', function() {
      var timedArray = new TimedArray();
      timedArray.insert(arrayA[1]);
      timedArray.insert(arrayA[0]);
      timedArray.insert(arrayA[3]);
      timedArray.insert(arrayA[2]);
      assert.deepEqual(timedArray.toArray(), [
        arrayA[0],
        arrayA[1],
        arrayA[2],
        arrayA[3]
      ]);
    });

    it('should throw exception upon adding a single time twice', function() {
      var timedArray = new TimedArray();
      timedArray.insert(arrayA[0]);
      assert.throws(function() {
        timedArray.insert(arrayA[0]);
      }, Error);
    });
  });

  describe('#sliceAtUntil()', function() {
    it('should have correct output', function() {
      var timedArray = new TimedArray();
      timedArray.insertAll(arrayA);
      assert.deepEqual([
        { time: 10 },
        { time: 20 },
        { time: 30 }
      ], timedArray.sliceAtUntil(5, 35));
      assert.deepEqual([
        { time: 10 },
        { time: 20 }
      ], timedArray.sliceAtUntil(5, 30));
      assert.deepEqual([
        { time: 10 },
        { time: 20 },
        { time: 30 }
      ], timedArray.sliceAtUntil(10, 35));
      assert.deepEqual([
        { time: 0 },
        { time: 10 }
      ], timedArray.sliceAtUntil(-5, 15));
      assert.deepEqual([
        { time: 50 }
      ], timedArray.sliceAtUntil(45, 55));
      assert.deepEqual([], timedArray.sliceAtUntil(41, 49));
      assert.deepEqual([], timedArray.sliceAtUntil(41, 50));
      assert.deepEqual([], timedArray.sliceAtUntil(55, 56));
      assert.deepEqual([], timedArray.sliceAtUntil(-5, -4));
      assert.deepEqual(arrayA, timedArray.sliceAtUntil(-5, 55));
    });
  });

  describe('#index', function() {
    var timedArrayA = new TimedArray();
    timedArrayA.push.apply(timedArrayA, arrayA);

    describe('AtOrBeforeTime()', function () {
      it('should return -1 when time is before first time', function () {
        assert.equal(-1,timedArrayA.indexAtOrBeforeTime(-5));
        assert.equal(-1,timedArrayA.indexAtOrBeforeTime(-1));
      });
      it('should return the index of item at the exact time', function() {
        assert.equal(0,timedArrayA.indexAtOrBeforeTime(0));
        assert.equal(1,timedArrayA.indexAtOrBeforeTime(10));
        assert.equal(5,timedArrayA.indexAtOrBeforeTime(50));
      });
      it('should return the index before the time', function() {
        assert.equal(0,timedArrayA.indexAtOrBeforeTime(5));
        assert.equal(1,timedArrayA.indexAtOrBeforeTime(15));
        assert.equal(5,timedArrayA.indexAtOrBeforeTime(55));
      });
    });

    describe('BeforeTime()', function () {
      it('should return -1 when time is before first time', function () {
        assert.equal(-1, timedArrayA.indexBeforeTime(-5));
        assert.equal(-1, timedArrayA.indexBeforeTime(-1));
      });
      it('should return -1 when time is same as first item', function() {
        assert.equal(-1, timedArrayA.indexBeforeTime(0));
      });
      
      it('should return the index of item before when item matches exact time', function() {
        assert.equal(0,timedArrayA.indexBeforeTime(10));
        assert.equal(4,timedArrayA.indexBeforeTime(50));
      });

      it('should return index before time', function() {
        assert.equal(0,timedArrayA.indexBeforeTime(5));
        assert.equal(1,timedArrayA.indexBeforeTime(15));
        assert.equal(5,timedArrayA.indexBeforeTime(55));
      });
    });

    describe('#indexAtOrAfterTime()', function () {
      it('should return 0 when time is before first time', function () {
        assert.equal(0, timedArrayA.indexAtOrAfterTime(-5));
        assert.equal(0, timedArrayA.indexAtOrAfterTime(-1));
      });
      it('should return the index of item at the exact time', function() {
        assert.equal(0, timedArrayA.indexAtOrAfterTime(0));
        assert.equal(1,timedArrayA.indexAtOrAfterTime(10));
        assert.equal(5,timedArrayA.indexAtOrAfterTime(50));
      });
      it('should return the index of item after when item matches exact time', function() {
        assert.equal(1,timedArrayA.indexAtOrAfterTime(5));
        assert.equal(2,timedArrayA.indexAtOrAfterTime(15));
      });
      it('should return -1 when time is after last time', function() {
        assert.equal(-1,timedArrayA.indexAtOrAfterTime(55));
      });
    });

    describe('AfterTime()', function () {
      it('should return 0 when time is before first time', function() {
        assert.equal(0, timedArrayA.indexAfterTime(-5));
        assert.equal(0, timedArrayA.indexAfterTime(-1));
      });
      it('should return the index of item after when item matches exact time', function() {
        assert.equal(1, timedArrayA.indexAfterTime(0));
        assert.equal(2,timedArrayA.indexAfterTime(10));
      });
      it('should return index after time', function() {
        assert.equal(1,timedArrayA.indexAfterTime(5));
        assert.equal(2,timedArrayA.indexAfterTime(15));
      });
      it('should return -1 when time is last time', function () {
        assert.equal(-1,timedArrayA.indexAfterTime(50));
      });
      it('should return -1 when time is after last time', function() {
        assert.equal(-1,timedArrayA.indexAfterTime(55));
      });
    });
  });
});