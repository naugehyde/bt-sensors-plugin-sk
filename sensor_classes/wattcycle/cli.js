#!/usr/bin/env node
/**
 * Standalone WattCycle / XDZN BLE probe.
 *
 * Scans for XDZN/WT-prefixed devices, connects to the first match (or to
 * a MAC passed as argv[2]), runs the HiLink auth handshake, and prints
 * decoded Analog Quantity / Warning Info / Product Info responses.
 *
 * Useful for verifying protocol port + hardware before wiring the
 * sensor into SignalK.
 *
 * Usage:
 *   node sensor_classes/wattcycle/cli.js               # scan + use first XDZN/WT match
 *   node sensor_classes/wattcycle/cli.js AA:BB:CC:DD:EE:FF
 *   SCAN_TIMEOUT=15 node sensor_classes/wattcycle/cli.js
 *
 * Requires (Linux only, root or BLE caps):
 *   npm i @abandonware/noble
 *   sudo setcap cap_net_raw+eip $(eval readlink -f $(which node))
 */

"use strict";

const proto = require("./protocol.js");

let noble;
try {
  noble = require("@abandonware/noble");
} catch (e) {
  console.error(
    "Missing dependency: @abandonware/noble\n" +
      "Install with:\n  npm i @abandonware/noble\n" +
      "(Linux only; on the Pi: sudo apt-get install -y libudev-dev build-essential)"
  );
  process.exit(2);
}

const TARGET_MAC = (process.argv[2] || "").toLowerCase();
const SCAN_TIMEOUT = Number(process.env.SCAN_TIMEOUT || 20) * 1000;
const READ_TIMEOUT_MS = 8000;
const SERVICE_SHORT = "fff0";
const NOTIFY_SHORT = "fff1";
const WRITE_SHORT = "fff2";
const AUTH_SHORT = "fffa";

const log = (...args) => console.log("[wattcycle]", ...args);
const fail = (msg, code = 1) => {
  console.error("[wattcycle] ERROR:", msg);
  process.exit(code);
};

function isWattCycleName(name) {
  if (!name) return false;
  const upper = name.toUpperCase();
  return proto.DEVICE_NAME_PREFIXES.some((p) => upper.startsWith(p));
}

function pickPeripheral() {
  return new Promise((resolve, reject) => {
    const seen = new Set();
    const timer = setTimeout(() => {
      noble.stopScanning();
      reject(new Error(`No matching device found in ${SCAN_TIMEOUT / 1000}s`));
    }, SCAN_TIMEOUT);

    noble.on("discover", (p) => {
      const name = p.advertisement?.localName || "";
      const mac = (p.address || "").toLowerCase();
      const key = `${mac}|${name}`;
      if (!seen.has(key)) {
        seen.add(key);
        log(`discovered: ${mac || "(no addr)"}  name="${name}"  rssi=${p.rssi}`);
      }
      const matchByMac = TARGET_MAC && mac === TARGET_MAC;
      const matchByName = !TARGET_MAC && isWattCycleName(name);
      if (matchByMac || matchByName) {
        clearTimeout(timer);
        noble.stopScanning();
        resolve(p);
      }
    });

    noble.startScanning([], true);
  });
}

function discoverChars(peripheral) {
  return new Promise((resolve, reject) => {
    peripheral.discoverSomeServicesAndCharacteristics(
      [SERVICE_SHORT],
      [NOTIFY_SHORT, WRITE_SHORT, AUTH_SHORT],
      (err, _services, characteristics) => {
        if (err) return reject(err);
        const byUuid = Object.fromEntries(
          characteristics.map((c) => [c.uuid.toLowerCase(), c])
        );
        const notify = byUuid[NOTIFY_SHORT];
        const write = byUuid[WRITE_SHORT];
        const auth = byUuid[AUTH_SHORT];
        if (!notify || !write) {
          return reject(new Error(`Missing characteristics: notify=${!!notify} write=${!!write}`));
        }
        resolve({ notify, write, auth });
      }
    );
  });
}

function awaitNotification(notify, dpAddress, timeoutMs = READ_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    let expected = -1;
    let settled = false;

    const cleanup = () => {
      notify.removeListener("data", onData);
      clearTimeout(timer);
    };
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error(`Timeout waiting DP 0x${dpAddress.toString(16)}`));
    }, timeoutMs);

    const onData = (buffer) => {
      if (settled) return;
      if (chunks.length === 0) {
        if (buffer.length < 8) return;
        if (buffer[0] !== proto.FRAME_HEAD && buffer[0] !== proto.FRAME_HEAD_ALT) return;
        if (buffer.readUInt16BE(4) !== dpAddress) return;
        expected = proto.expectedResponseLength(buffer);
      }
      chunks.push(buffer);
      total += buffer.length;
      if (total >= expected) {
        const full = Buffer.concat(chunks, total).subarray(0, expected);
        settled = true;
        cleanup();
        if (!proto.verifyCrc(full)) {
          reject(new Error("CRC mismatch"));
          return;
        }
        const frame = proto.parseFrame(full);
        if (!frame) {
          reject(new Error("Bad frame"));
          return;
        }
        resolve(frame);
      }
    };
    notify.on("data", onData);
  });
}

function writeChar(ch, buf, withResponse = false) {
  return new Promise((resolve, reject) => {
    ch.write(buf, !withResponse, (err) => (err ? reject(err) : resolve()));
  });
}

async function readDP(notify, write, dpAddress, frameHead) {
  const tx = proto.buildReadFrame(dpAddress, 0, frameHead);
  const waiter = awaitNotification(notify, dpAddress);
  await writeChar(write, Buffer.from(tx), false);
  return waiter;
}

async function detectFrameHead(notify, write) {
  for (const head of [proto.FRAME_HEAD, proto.FRAME_HEAD_ALT]) {
    try {
      log(`probing frame head 0x${head.toString(16)}...`);
      await readDP(notify, write, proto.DP_PRODUCT_INFO, head);
      log(`frame head 0x${head.toString(16)} OK`);
      return head;
    } catch (e) {
      log(`head 0x${head.toString(16)} no response: ${e.message}`);
    }
  }
  throw new Error("Could not detect frame head; device unresponsive");
}

function fmt(n, digits = 3) {
  if (n == null) return "—";
  return Number(n).toFixed(digits);
}

function dump(label, obj) {
  console.log(`\n--- ${label} ---`);
  console.log(JSON.stringify(obj, null, 2));
}

async function main() {
  log(TARGET_MAC ? `looking for ${TARGET_MAC}` : "scanning for XDZN*/WT* devices");

  if (noble.state !== "poweredOn") {
    await new Promise((resolve) => {
      const onState = (s) => {
        if (s === "poweredOn") {
          noble.removeListener("stateChange", onState);
          resolve();
        }
      };
      noble.on("stateChange", onState);
    });
  }

  const peripheral = await pickPeripheral();
  log(
    `connecting to ${peripheral.address} (name="${peripheral.advertisement?.localName}")`
  );
  await new Promise((resolve, reject) =>
    peripheral.connect((err) => (err ? reject(err) : resolve()))
  );

  try {
    const { notify, write, auth } = await discoverChars(peripheral);
    log("characteristics ready");

    await new Promise((resolve, reject) =>
      notify.subscribe((err) => (err ? reject(err) : resolve()))
    );
    log("notifications enabled on FFF1");

    if (auth) {
      try {
        await writeChar(auth, Buffer.from(proto.AUTH_KEY), true);
        log("auth: 'HiLink' written to FFFA");
      } catch (e) {
        log(`auth write failed (continuing): ${e.message}`);
      }
    } else {
      log("FFFA characteristic absent; skipping auth");
    }

    const head = await detectFrameHead(notify, write);

    const product = await readDP(notify, write, proto.DP_PRODUCT_INFO, head);
    dump("Product Info (DP 0x0092)", proto.parseProductInfo(product.data));

    const aqFrame = await readDP(notify, write, proto.DP_ANALOG_QUANTITY, head);
    const aq = proto.parseAnalogQuantity(aqFrame.data);
    dump("Analog Quantity (DP 0x008C)", aq);
    if (aq) {
      console.log(
        `\n  Voltage:  ${fmt(aq.moduleVoltage, 2)} V` +
          `   Current: ${fmt(aq.current, 2)} A` +
          `   SOC: ${aq.soc}%` +
          (aq.soh != null ? `   SOH: ${aq.soh}%` : "")
      );
      console.log(
        `  Cells:    ${aq.cellVoltages.map((v) => fmt(v, 3)).join(" / ")} V`
      );
      console.log(
        `  Temps:    MOS=${fmt(aq.mosTemperature, 1)}°C  PCB=${fmt(
          aq.pcbTemperature,
          1
        )}°C  cells=[${aq.cellTemperatures.map((t) => fmt(t, 1)).join(", ")}] °C`
      );
      console.log(
        `  Capacity: rem ${fmt(aq.remainingCapacity, 1)} Ah / total ${fmt(
          aq.totalCapacity,
          1
        )} Ah / design ${fmt(aq.designCapacity, 1)} Ah  cycles=${aq.cycleNumber}`
      );
    }

    const wiFrame = await readDP(notify, write, proto.DP_WARNING_INFO, head);
    const wi = proto.parseWarningInfo(wiFrame.data);
    dump("Warning Info (DP 0x008D)", wi);
    if (wi) {
      console.log(
        `\n  protections: ${wi.protections.length ? wi.protections.join(", ") : "(none)"}`
      );
      console.log(
        `  faults:      ${wi.faults.length ? wi.faults.join(", ") : "(none)"}`
      );
      console.log(
        `  warnings:    ${wi.warnings.length ? wi.warnings.join(", ") : "(none)"}`
      );
    }
  } finally {
    try {
      await new Promise((resolve) => peripheral.disconnect(() => resolve()));
    } catch (_e) { /* ignore */ }
    log("disconnected");
    setTimeout(() => process.exit(0), 100);
  }
}

main().catch((e) => fail(e.stack || e.message));
