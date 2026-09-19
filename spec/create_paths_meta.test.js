"use strict";

// Regression test for BTSensor::createPaths (see BTSensor.js), which
// publishes each configured path's default metadata (units/zones/renderer)
// to the server on every plugin activation -- i.e. every server restart,
// not just a fresh install.
//
// Before ce14e39, createPaths always sent a raw handleMessage meta delta,
// which the server applies unconditionally -- so any zones/units a user had
// configured through the server's own meta editor (or an API PUT to
// vessels/self/<path>/meta) got silently wiped out again on every restart.
// setDefaultMetadata is the server API meant for exactly this: it only
// fills in fields the user hasn't already set, and is idempotent across
// restarts. This test locks in that createPaths prefers setDefaultMetadata
// when the server offers it, and only falls back to the old raw-delta
// behaviour on servers too old to have the method.

const test = require("node:test");
const assert = require("node:assert/strict");

const JBDBMS = require("../sensor_classes/JBDBMS.js");

// Enough of a SignalK app to catch what createPaths sends. Pass
// withSetDefaultMetadata: false to simulate an older server that only
// offers handleMessage.
function appStub({ withSetDefaultMetadata = true } = {}) {
  const deltas = [];
  const setDefaultMetadataCalls = [];
  const app = {
    deltas,
    setDefaultMetadataCalls,
    debug() {},
    setPluginError() {},
    handleMessage(id, delta) {
      deltas.push(delta);
    },
  };
  if (withSetDefaultMetadata) {
    app.setDefaultMetadata = (path, value) => {
      setDefaultMetadataCalls.push({ path, value });
      return Promise.resolve(true);
    };
  }
  return app;
}

async function buildSensor(app) {
  const sensor = new JBDBMS(
    {},
    {
      numberOfCells: 4,
      numberOfTemps: 1,
      currentProperties: {
        Name: "DP04S007L4S200A",
        Address: "A5:C2:37:40:01:46",
      },
      batteryID: "house1",
    }
  );
  sensor._app = app;
  await sensor.initSchema();
  return sensor;
}

// Mirrors the backfill step in BTSensor::activate(): every schema-declared
// path gets its default filled in to config.paths, as happens with a
// freshly-saved config.
function configWithDefaultPaths(sensor) {
  const paths = {};
  Object.keys(sensor.getPaths()).forEach((tag) => {
    const schemaDef = sensor.getPath(tag);
    if (schemaDef?.default !== undefined) paths[tag] = schemaDef.default;
  });
  return { paths };
}

test("createPaths uses setDefaultMetadata, not a raw meta delta, when the server supports it", async () => {
  const app = appStub({ withSetDefaultMetadata: true });
  const sensor = await buildSensor(app);
  const config = configWithDefaultPaths(sensor);

  sensor.createPaths(config, "test-plugin");

  assert.ok(
    app.setDefaultMetadataCalls.length > 0,
    "expected at least one setDefaultMetadata call"
  );
  assert.equal(
    app.deltas.length,
    0,
    "must not also send a raw meta delta when setDefaultMetadata is available"
  );

  const voltageCall = app.setDefaultMetadataCalls.find(
    (c) => c.path === "electrical.batteries.house1.voltage"
  );
  assert.ok(voltageCall, "voltage path must be published");
  assert.equal(voltageCall.value.units, "V");
});

test("createPaths falls back to a raw meta delta on servers without setDefaultMetadata", async () => {
  const app = appStub({ withSetDefaultMetadata: false });
  const sensor = await buildSensor(app);
  const config = configWithDefaultPaths(sensor);

  sensor.createPaths(config, "test-plugin");

  assert.ok(app.deltas.length > 0, "expected at least one meta delta");

  const metas = app.deltas.flatMap((d) => d.updates.flatMap((u) => u.meta));
  const voltageMeta = metas.find(
    (m) => m.path === "electrical.batteries.house1.voltage"
  );
  assert.ok(voltageMeta, "voltage path must be published");
  assert.equal(voltageMeta.value.units, "V");
});

test("createPaths skips tags with no path configured", async () => {
  const app = appStub({ withSetDefaultMetadata: true });
  const sensor = await buildSensor(app);
  const config = { paths: {} }; // nothing configured for any tag

  sensor.createPaths(config, "test-plugin");

  assert.equal(app.setDefaultMetadataCalls.length, 0);
});
