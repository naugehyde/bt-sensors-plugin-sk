/**
 * Tests for DeviceTracker: unconfigured addresses become sensors only when they persist,
 * and stop being sensors when BlueZ stops reporting them.
 * Run with: node --test spec/device_tracker.test.js
 */

"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const DeviceTracker = require("../DeviceTracker");

const none = () => false;
const S = 1000;

test("an address is not promoted until BlueZ has reported it for promoteAfterMs", () => {
  const t = new DeviceTracker({ promoteAfterMs: 60 * S });
  assert.deepEqual(t.scan(["AA"], 0, none, []).promote, []);
  assert.deepEqual(t.scan(["AA"], 50 * S, none, []).promote, []);
  assert.deepEqual(t.scan(["AA"], 60 * S, none, []).promote, ["AA"]);
});

test("a one-off random address that BlueZ drops is never promoted, and is forgotten", () => {
  const t = new DeviceTracker({ promoteAfterMs: 60 * S, expireAfterMs: 300 * S });
  t.scan(["R1"], 0, none, []);
  t.scan([], 30 * S, none, []);
  assert.equal(t.seen.size, 0);
  // the same address coming back starts its clock again
  assert.deepEqual(t.scan(["R1"], 40 * S, none, []).promote, []);
  assert.deepEqual(t.scan(["R1"], 90 * S, none, []).promote, []);
  assert.deepEqual(t.scan(["R1"], 100 * S, none, []).promote, ["R1"]);
});

test("a constant stream of new random addresses keeps the tracker bounded", () => {
  const t = new DeviceTracker({ promoteAfterMs: 60 * S, expireAfterMs: 300 * S });
  let promoted = 0;
  let most = 0;
  // 15 new addresses every 10 s scan for 6 hours, each reported for 30 s then dropped
  const live = [];
  for (let now = 0, n = 0; now < 6 * 3600 * S; now += 10 * S) {
    for (let i = 0; i < 15; i++) live.push({ mac: `R${n++}`, until: now + 30 * S });
    while (live.length && live[0].until < now) live.shift();
    promoted += t.scan(live.map((d) => d.mac), now, none, []).promote.length;
    most = Math.max(most, t.seen.size);
  }
  assert.equal(promoted, 0);
  assert.ok(most <= 15 * 4, `the tracker held ${most} addresses at most`);
});

test("an unconfigured sensor expires once BlueZ has not reported it for expireAfterMs", () => {
  const t = new DeviceTracker({ promoteAfterMs: 0, expireAfterMs: 300 * S });
  t.scan(["AA"], 0, none, []);
  assert.deepEqual(t.scan([], 200 * S, none, ["AA"]).expire, []);
  assert.deepEqual(t.scan([], 301 * S, none, ["AA"]).expire, ["AA"]);
});

test("an unconfigured sensor still reported by BlueZ never expires", () => {
  const t = new DeviceTracker({ promoteAfterMs: 0, expireAfterMs: 300 * S });
  for (let now = 0; now < 3600 * S; now += 10 * S)
    assert.deepEqual(t.scan(["AA"], now, none, ["AA"]).expire, []);
});

test("configured devices are never promoted or expired by the tracker", () => {
  const t = new DeviceTracker({ promoteAfterMs: 0, expireAfterMs: 1 });
  const configured = (m) => m === "CFG";
  const r = t.scan(["CFG"], 0, configured, []);
  assert.deepEqual(r.promote, []);
  assert.deepEqual(t.scan([], 10 * S, configured, ["CFG"]).expire, []);
});

test("maxUnconfigured caps the list, expiring the least recently seen first", () => {
  const t = new DeviceTracker({ promoteAfterMs: 0, expireAfterMs: 3600 * S, maxUnconfigured: 2 });
  t.scan(["A"], 0, none, []);
  t.scan(["B"], 10 * S, none, []);
  t.scan(["C"], 20 * S, none, []);
  const r = t.scan(["A", "B", "C"], 30 * S, none, ["A", "B", "C"]);
  assert.equal(r.expire.length, 1);
  const r2 = t.scan([], 40 * S, none, ["A", "B"]);
  assert.deepEqual(r2.promote, []);
});

test("no promotion beyond maxUnconfigured", () => {
  const t = new DeviceTracker({ promoteAfterMs: 0, maxUnconfigured: 2 });
  const r = t.scan(["A", "B", "C", "D"], 0, none, []);
  assert.equal(r.promote.length, 2);
});
