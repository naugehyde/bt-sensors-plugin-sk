/**
 * Tests for the WattCycle protocol module.
 * Run with: node --test spec/wattcycle_protocol.test.js
 *
 * Captured fixtures are taken verbatim from the upstream wattcycle_ble
 * Python project (tests/test_protocol.py) - real device traffic from
 * an XDZN_001_EF2F unit.
 */

"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  DP_ANALOG_QUANTITY,
  DP_PRODUCT_INFO,
  DP_WARNING_INFO,
  modbusCrc16,
  buildReadFrame,
  verifyCrc,
  expectedResponseLength,
  parseFrame,
  parseCurrentNegative,
  parseAnalogQuantity,
  parseProductInfo,
  parseWarningInfo,
} = require("../sensor_classes/wattcycle/protocol.js");

const SAMPLE_WARNING = Buffer.from([
  0x7e, 0x00, 0x01, 0x03, 0x00, 0x8d, 0x00, 0x18,
  0x04, 0x00, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x06, 0x01, 0x00, 0x00, 0x18, 0x00, 0x00, 0x00,
  0x1f, 0x91, 0x0d,
]);

const SAMPLE_ANALOG = Buffer.from([
  0x7e, 0x00, 0x01, 0x03, 0x00, 0x8c, 0x00, 0x20,
  0x04, 0x0c, 0xde, 0x0c, 0xdd, 0x0c, 0xdf, 0x0c,
  0xda, 0x04, 0x0b, 0x65, 0x0b, 0x70, 0x0b, 0x5a,
  0x0b, 0x5a, 0x40, 0x00, 0x05, 0x25, 0x07, 0x2a,
  0x0c, 0x44, 0x00, 0x05, 0x0c, 0x44, 0x00, 0x3a,
  0x4b, 0x22, 0x0d,
]);

const SAMPLE_PRODUCT = Buffer.from([
  0x7e, 0x00, 0x01, 0x03, 0x00, 0x92, 0x00, 0x3c,
  0x57, 0x54, 0x31, 0x32, 0x5f, 0x32, 0x30, 0x30,
  0x30, 0x34, 0x53, 0x57, 0x31, 0x30, 0x5f, 0x4c,
  0x34, 0x34, 0x37, 0x00, 0x20, 0x20, 0x20, 0x20,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x36, 0x30, 0x30, 0x31, 0x36, 0x30, 0x31, 0x36,
  0x32, 0x30, 0x37, 0x32, 0x37, 0x30, 0x30, 0x30,
  0x31, 0x00, 0x00, 0x00,
  0x52, 0xaa, 0x0d,
]);

test("modbusCrc16: matches captured warning payload CRC", () => {
  const payload = SAMPLE_WARNING.subarray(0, SAMPLE_WARNING.length - 3);
  assert.equal(modbusCrc16(payload), 0x1f91);
});

test("modbusCrc16: matches captured analog payload CRC", () => {
  const payload = SAMPLE_ANALOG.subarray(0, SAMPLE_ANALOG.length - 3);
  const expected = SAMPLE_ANALOG.readUInt16BE(SAMPLE_ANALOG.length - 3);
  assert.equal(modbusCrc16(payload), expected);
});

test("modbusCrc16: matches captured product payload CRC", () => {
  const payload = SAMPLE_PRODUCT.subarray(0, SAMPLE_PRODUCT.length - 3);
  const expected = SAMPLE_PRODUCT.readUInt16BE(SAMPLE_PRODUCT.length - 3);
  assert.equal(modbusCrc16(payload), expected);
});

test("modbusCrc16: empty input does not throw", () => {
  assert.equal(typeof modbusCrc16(Buffer.alloc(0)), "number");
});

test("buildReadFrame: analog-quantity request matches spec", () => {
  const frame = buildReadFrame(DP_ANALOG_QUANTITY);
  assert.equal(frame[0], 0x7e);
  assert.equal(frame[1], 0x00);
  assert.equal(frame[2], 0x01);
  assert.equal(frame[3], 0x03);
  assert.equal(frame.readUInt16BE(4), 0x008c);
  assert.equal(frame.readUInt16BE(6), 0);
  assert.equal(frame[10], 0x0d);
  assert.equal(frame.length, 11);
});

test("buildReadFrame: warning-info & product-info DP addresses", () => {
  assert.equal(buildReadFrame(DP_WARNING_INFO).readUInt16BE(4), 0x008d);
  assert.equal(buildReadFrame(DP_PRODUCT_INFO).readUInt16BE(4), 0x0092);
});

test("buildReadFrame: alternative frame head 0x1E", () => {
  const frame = buildReadFrame(DP_ANALOG_QUANTITY, 0, 0x1e);
  assert.equal(frame[0], 0x1e);
  assert.equal(frame[10], 0x0d);
  assert.ok(verifyCrc(frame));
});

test("verifyCrc: real frames pass; corrupted/short frames fail", () => {
  assert.ok(verifyCrc(SAMPLE_WARNING));
  assert.ok(verifyCrc(SAMPLE_ANALOG));
  assert.ok(verifyCrc(SAMPLE_PRODUCT));

  const bad = Buffer.from(SAMPLE_WARNING);
  bad[10] ^= 0xff;
  assert.equal(verifyCrc(bad), false);

  assert.equal(verifyCrc(Buffer.from([0x7e, 0x00, 0x01])), false);
});

test("expectedResponseLength: derives total length from data_len field", () => {
  // SAMPLE_WARNING: data_len = 0x18 (24), total = 24 + 11 = 35
  assert.equal(expectedResponseLength(SAMPLE_WARNING), 35);
  assert.equal(expectedResponseLength(Buffer.alloc(4)), null);
});

test("parseFrame: warning frame metadata", () => {
  const f = parseFrame(SAMPLE_WARNING);
  assert.ok(f);
  assert.equal(f.version, 0);
  assert.equal(f.address, 1);
  assert.equal(f.functionCode, 0x03);
  assert.equal(f.startAddress, 0x8d);
  assert.equal(f.dataLength, 24);
  assert.equal(f.data.length, 24);
});

test("parseFrame: error response (func 0x86) returns null", () => {
  const bad = Buffer.from(SAMPLE_WARNING);
  bad[3] = 0x86;
  assert.equal(parseFrame(bad), null);
});

test("parseFrame: bad head/tail/short returns null", () => {
  const badHead = Buffer.from(SAMPLE_WARNING);
  badHead[0] = 0xff;
  assert.equal(parseFrame(badHead), null);

  const badTail = Buffer.from(SAMPLE_WARNING);
  badTail[badTail.length - 1] = 0xff;
  assert.equal(parseFrame(badTail), null);

  assert.equal(parseFrame(Buffer.from([0x7e, 0x00])), null);
});

test("parseCurrentNegative: zero", () => {
  const r = parseCurrentNegative(Buffer.from([0x00, 0x00]), 0);
  assert.equal(r.current, 0);
  assert.equal(r.offset, 2);
});

test("parseCurrentNegative: positive with decimal flag", () => {
  // 0x40 = decimal, 0x64 = 100 -> 10.0
  assert.equal(parseCurrentNegative(Buffer.from([0x40, 0x64]), 0).current, 10.0);
});

test("parseCurrentNegative: negative with decimal flag", () => {
  // 0xC0 = sign+decimal, 0x64 = 100 -> -10.0
  assert.equal(parseCurrentNegative(Buffer.from([0xc0, 0x64]), 0).current, -10.0);
});

test("parseCurrentNegative: positive integer (no decimal)", () => {
  assert.equal(parseCurrentNegative(Buffer.from([0x00, 0x0a]), 0).current, 10.0);
});

test("parseCurrentNegative: negative integer (no decimal)", () => {
  assert.equal(parseCurrentNegative(Buffer.from([0x80, 0x0a]), 0).current, -10.0);
});

test("parseCurrentNegative: 102.3 A boundary", () => {
  // 0x43 0xFF -> decimal, raw = 0xFF | (0x03 << 8) = 1023 -> 102.3
  const r = parseCurrentNegative(Buffer.from([0x43, 0xff]), 0);
  assert.ok(Math.abs(r.current - 102.3) < 0.01);
});

test("parseAnalogQuantity: real captured response decodes correctly", () => {
  const f = parseFrame(SAMPLE_ANALOG);
  assert.ok(f);
  const aq = parseAnalogQuantity(f.data);
  assert.ok(aq);

  assert.equal(aq.cellCount, 4);
  assert.equal(aq.cellVoltages.length, 4);
  assert.ok(Math.abs(aq.cellVoltages[0] - 3.294) < 0.001);
  assert.ok(Math.abs(aq.cellVoltages[3] - 3.290) < 0.001);

  assert.equal(aq.temperatureCount, 4);
  assert.ok(Math.abs(aq.mosTemperature - 18.7) < 0.1);
  assert.ok(Math.abs(aq.pcbTemperature - 19.8) < 0.1);
  assert.equal(aq.cellTemperatures.length, 2);
  assert.ok(Math.abs(aq.cellTemperatures[0] - 17.6) < 0.1);

  assert.equal(aq.current, 0);
  assert.ok(Math.abs(aq.moduleVoltage - 13.17) < 0.01);
  assert.ok(Math.abs(aq.remainingCapacity - 183.4) < 0.1);
  assert.ok(Math.abs(aq.totalCapacity - 314.0) < 0.1);
  assert.equal(aq.cycleNumber, 5);
  assert.ok(Math.abs(aq.designCapacity - 314.0) < 0.1);
  assert.equal(aq.soc, 58);
});

test("parseAnalogQuantity: short / empty input returns null", () => {
  assert.equal(parseAnalogQuantity(Buffer.alloc(0)), null);
  assert.equal(parseAnalogQuantity(Buffer.from([0x04])), null);
});

test("parseProductInfo: real captured response decodes ASCII", () => {
  const f = parseFrame(SAMPLE_PRODUCT);
  const pi = parseProductInfo(f.data);
  assert.ok(pi);
  assert.equal(pi.firmwareVersion, "WT12_20004SW10_L447");
  assert.equal(pi.serialNumber, "60016016207270001");
});

test("parseProductInfo: wrong length returns null", () => {
  assert.equal(parseProductInfo(Buffer.alloc(30)), null);
});

test("parseWarningInfo: real captured response decodes; no flags set", () => {
  const f = parseFrame(SAMPLE_WARNING);
  const wi = parseWarningInfo(f.data);
  assert.ok(wi);
  assert.equal(wi.cellCount, 4);
  assert.equal(wi.cellStates.length, 4);
  assert.equal(wi.temperatureCount, 4);
  assert.deepEqual(wi.protections, []);
  assert.deepEqual(wi.faults, []);
  assert.deepEqual(wi.warnings, []);
});

test("parseWarningInfo: empty input returns null", () => {
  assert.equal(parseWarningInfo(Buffer.alloc(0)), null);
});
