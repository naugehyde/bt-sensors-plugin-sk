#!/usr/bin/env node
/**
 * Standalone WattCycle / XDZN BLE probe via BlueZ D-Bus.
 *
 * Uses @naugehyde/node-ble (same library as the plugin), so it does NOT
 * require setcap/raw HCI access — it talks to the BlueZ daemon over
 * D-Bus and works with whichever adapter BlueZ chose.
 *
 * Connects to the device, runs the HiLink auth handshake, autodetects
 * the frame head, and prints decoded Analog Quantity / Warning Info /
 * Product Info responses.
 *
 * Usage:
 *   sudo node sensor_classes/wattcycle/cli-dbus.js C0:D6:3C:5A:55:B2
 *   ADAPTER=hci1 sudo node sensor_classes/wattcycle/cli-dbus.js C0:D6:3C:5A:55:B2
 *
 * For non-root usage, add a D-Bus policy under /etc/dbus-1/system.d/
 * granting your user access to org.bluez (see project README / NOTICE).
 */

"use strict";

const proto = require("./protocol.js");

let createBluetooth;
try {
  ({ createBluetooth } = require("@naugehyde/node-ble"));
} catch (e) {
  console.error(
    "Missing dependency: @naugehyde/node-ble\n" +
      "Install with:\n  npm i @naugehyde/node-ble\n"
  );
  process.exit(2);
}

const TARGET_MAC = (process.argv[2] || "").toUpperCase();
const ADAPTER_NAME = process.env.ADAPTER || null;
const SCAN_TIMEOUT_MS = Number(process.env.SCAN_TIMEOUT || 25) * 1000;
const READ_TIMEOUT_MS = 8000;

if (!TARGET_MAC) {
  console.error("Usage: node cli-dbus.js <MAC>  (e.g. C0:D6:3C:5A:55:B2)");
  process.exit(2);
}

const log = (...args) => console.log("[wattcycle]", ...args);

function awaitNotification(notifyChar, dpAddress, timeoutMs = READ_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    let expected = -1;
    let settled = false;

    const cleanup = () => {
      notifyChar.removeListener("valuechanged", onVal);
      clearTimeout(timer);
    };
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error(`Timeout waiting DP 0x${dpAddress.toString(16)}`));
    }, timeoutMs);

    const onVal = (buffer) => {
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
        if (!frame) return reject(new Error("Bad frame"));
        resolve(frame);
      }
    };
    notifyChar.on("valuechanged", onVal);
  });
}

async function readDP(notifyChar, writeChar, dpAddress, frameHead) {
  const tx = proto.buildReadFrame(dpAddress, 0, frameHead);
  const waiter = awaitNotification(notifyChar, dpAddress);
  await writeChar.writeValueWithoutResponse(Buffer.from(tx));
  return waiter;
}

async function detectFrameHead(notifyChar, writeChar) {
  for (const head of [proto.FRAME_HEAD, proto.FRAME_HEAD_ALT]) {
    try {
      log(`probing frame head 0x${head.toString(16)}...`);
      await readDP(notifyChar, writeChar, proto.DP_PRODUCT_INFO, head);
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

async function getAdapter(bluetooth) {
  if (ADAPTER_NAME) {
    log(`using adapter ${ADAPTER_NAME}`);
    if (typeof bluetooth.getAdapter === "function") {
      return bluetooth.getAdapter(ADAPTER_NAME);
    }
    if (typeof bluetooth.adapter === "function") {
      return bluetooth.adapter(ADAPTER_NAME);
    }
    log(`adapter() not in this node-ble version; falling back to defaultAdapter()`);
  }
  return bluetooth.defaultAdapter();
}

async function main() {
  const { bluetooth, destroy } = createBluetooth();
  const adapter = await getAdapter(bluetooth);
  if (!(await adapter.isPowered())) {
    log("powering on adapter...");
    await adapter.setPowered(true);
  }
  if (!(await adapter.isDiscovering())) {
    log("starting discovery...");
    try {
      await adapter.startDiscovery();
    } catch (e) {
      log(`discovery start warning: ${e.message}`);
    }
  }

  log(`waiting for ${TARGET_MAC} (timeout ${SCAN_TIMEOUT_MS / 1000}s)...`);
  const device = await adapter.waitDevice(TARGET_MAC, SCAN_TIMEOUT_MS);
  try { await adapter.stopDiscovery(); } catch (_e) { /* ignore */ }

  log(`connecting to ${TARGET_MAC}...`);
  await device.connect();
  log("connected");

  try {
    const gatt = await device.gatt();
    const service = await gatt.getPrimaryService(proto.SERVICE_UUID);
    const notifyChar = await service.getCharacteristic(proto.NOTIFY_UUID);
    const writeChar = await service.getCharacteristic(proto.WRITE_UUID);

    let authChar = null;
    try {
      authChar = await service.getCharacteristic(proto.AUTH_UUID);
    } catch (e) {
      log(`auth char missing: ${e.message}`);
    }

    await notifyChar.startNotifications();
    log("notifications enabled on FFF1");

    if (authChar) {
      try {
        await authChar.writeValue(Buffer.from(proto.AUTH_KEY));
        log("auth: 'HiLink' written to FFFA");
      } catch (e) {
        log(`auth write failed (continuing): ${e.message}`);
      }
    }

    const head = await detectFrameHead(notifyChar, writeChar);

    const product = await readDP(notifyChar, writeChar, proto.DP_PRODUCT_INFO, head);
    dump("Product Info (DP 0x0092)", proto.parseProductInfo(product.data));

    const aqFrame = await readDP(notifyChar, writeChar, proto.DP_ANALOG_QUANTITY, head);
    const aq = proto.parseAnalogQuantity(aqFrame.data);
    dump("Analog Quantity (DP 0x008C)", aq);
    if (aq) {
      console.log(
        `\n  Voltage:  ${fmt(aq.moduleVoltage, 2)} V` +
          `   Current: ${fmt(aq.current, 2)} A` +
          `   SOC: ${aq.soc}%` +
          (aq.soh != null ? `   SOH: ${aq.soh}%` : "")
      );
      console.log(`  Cells:    ${aq.cellVoltages.map((v) => fmt(v, 3)).join(" / ")} V`);
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

    const wiFrame = await readDP(notifyChar, writeChar, proto.DP_WARNING_INFO, head);
    const wi = proto.parseWarningInfo(wiFrame.data);
    dump("Warning Info (DP 0x008D)", wi);
    if (wi) {
      console.log(`\n  protections: ${wi.protections.length ? wi.protections.join(", ") : "(none)"}`);
      console.log(`  faults:      ${wi.faults.length ? wi.faults.join(", ") : "(none)"}`);
      console.log(`  warnings:    ${wi.warnings.length ? wi.warnings.join(", ") : "(none)"}`);
    }
  } finally {
    try {
      await device.disconnect();
      log("disconnected");
    } catch (_e) { /* ignore */ }
    destroy();
    setTimeout(() => process.exit(0), 200);
  }
}

main().catch((e) => {
  console.error("[wattcycle] ERROR:", e.stack || e.message);
  process.exit(1);
});
