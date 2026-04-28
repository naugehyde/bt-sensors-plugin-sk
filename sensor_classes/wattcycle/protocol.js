/**
 * Wattcycle / XDZN BLE protocol: frame building, parsing, and CRC.
 *
 * Ported from https://github.com/qume/wattcycle_ble (Python),
 * itself reverse-engineered from the `com.gz.wattcycle` Android APK.
 *
 * See sensor_classes/wattcycle/PROTOCOL.md for the protocol reference.
 */

"use strict";

// --- BLE UUIDs ---
const SERVICE_UUID = "0000fff0-0000-1000-8000-00805f9b34fb";
const WRITE_UUID = "0000fff2-0000-1000-8000-00805f9b34fb";
const NOTIFY_UUID = "0000fff1-0000-1000-8000-00805f9b34fb";
const AUTH_UUID = "0000fffa-0000-1000-8000-00805f9b34fb";

// --- Protocol constants ---
const FRAME_HEAD = 0x7e;
const FRAME_HEAD_ALT = 0x1e;
const FRAME_TAIL = 0x0d;
const FUNC_READ = 0x03;
const FUNC_WRITE = 0x06;
const FUNC_ERROR = 0x86;
const DEVICE_ADDR = 0x01;
const MIN_FRAME_SIZE = 11;

const AUTH_KEY = Buffer.from("HiLink", "utf8");
const DEVICE_NAME_PREFIXES = ["XDZN", "WT"];

// --- DP addresses ---
const DP_ANALOG_QUANTITY = 0x008c; // 140
const DP_WARNING_INFO = 0x008d; // 141
const DP_PRODUCT_INFO = 0x0092; // 146

// --- Modbus CRC16 lookup tables ---
const CRC_HI = Buffer.from([
  0x00, 0xc1, 0x81, 0x40, 0x01, 0xc0, 0x80, 0x41, 0x01, 0xc0, 0x80, 0x41, 0x00, 0xc1, 0x81, 0x40,
  0x01, 0xc0, 0x80, 0x41, 0x00, 0xc1, 0x81, 0x40, 0x00, 0xc1, 0x81, 0x40, 0x01, 0xc0, 0x80, 0x41,
  0x01, 0xc0, 0x80, 0x41, 0x00, 0xc1, 0x81, 0x40, 0x00, 0xc1, 0x81, 0x40, 0x01, 0xc0, 0x80, 0x41,
  0x00, 0xc1, 0x81, 0x40, 0x01, 0xc0, 0x80, 0x41, 0x01, 0xc0, 0x80, 0x41, 0x00, 0xc1, 0x81, 0x40,
  0x01, 0xc0, 0x80, 0x41, 0x00, 0xc1, 0x81, 0x40, 0x00, 0xc1, 0x81, 0x40, 0x01, 0xc0, 0x80, 0x41,
  0x00, 0xc1, 0x81, 0x40, 0x01, 0xc0, 0x80, 0x41, 0x01, 0xc0, 0x80, 0x41, 0x00, 0xc1, 0x81, 0x40,
  0x00, 0xc1, 0x81, 0x40, 0x01, 0xc0, 0x80, 0x41, 0x01, 0xc0, 0x80, 0x41, 0x00, 0xc1, 0x81, 0x40,
  0x01, 0xc0, 0x80, 0x41, 0x00, 0xc1, 0x81, 0x40, 0x00, 0xc1, 0x81, 0x40, 0x01, 0xc0, 0x80, 0x41,
  0x01, 0xc0, 0x80, 0x41, 0x00, 0xc1, 0x81, 0x40, 0x00, 0xc1, 0x81, 0x40, 0x01, 0xc0, 0x80, 0x41,
  0x00, 0xc1, 0x81, 0x40, 0x01, 0xc0, 0x80, 0x41, 0x01, 0xc0, 0x80, 0x41, 0x00, 0xc1, 0x81, 0x40,
  0x00, 0xc1, 0x81, 0x40, 0x01, 0xc0, 0x80, 0x41, 0x01, 0xc0, 0x80, 0x41, 0x00, 0xc1, 0x81, 0x40,
  0x01, 0xc0, 0x80, 0x41, 0x00, 0xc1, 0x81, 0x40, 0x00, 0xc1, 0x81, 0x40, 0x01, 0xc0, 0x80, 0x41,
  0x00, 0xc1, 0x81, 0x40, 0x01, 0xc0, 0x80, 0x41, 0x01, 0xc0, 0x80, 0x41, 0x00, 0xc1, 0x81, 0x40,
  0x01, 0xc0, 0x80, 0x41, 0x00, 0xc1, 0x81, 0x40, 0x00, 0xc1, 0x81, 0x40, 0x01, 0xc0, 0x80, 0x41,
  0x01, 0xc0, 0x80, 0x41, 0x00, 0xc1, 0x81, 0x40, 0x00, 0xc1, 0x81, 0x40, 0x01, 0xc0, 0x80, 0x41,
  0x00, 0xc1, 0x81, 0x40, 0x01, 0xc0, 0x80, 0x41, 0x01, 0xc0, 0x80, 0x41, 0x00, 0xc1, 0x81, 0x40,
]);

const CRC_LO = Buffer.from([
  0x00, 0xc0, 0xc1, 0x01, 0xc3, 0x03, 0x02, 0xc2, 0xc6, 0x06, 0x07, 0xc7, 0x05, 0xc5, 0xc4, 0x04,
  0xcc, 0x0c, 0x0d, 0xcd, 0x0f, 0xcf, 0xce, 0x0e, 0x0a, 0xca, 0xcb, 0x0b, 0xc9, 0x09, 0x08, 0xc8,
  0xd8, 0x18, 0x19, 0xd9, 0x1b, 0xdb, 0xda, 0x1a, 0x1e, 0xde, 0xdf, 0x1f, 0xdd, 0x1d, 0x1c, 0xdc,
  0x14, 0xd4, 0xd5, 0x15, 0xd7, 0x17, 0x16, 0xd6, 0xd2, 0x12, 0x13, 0xd3, 0x11, 0xd1, 0xd0, 0x10,
  0xf0, 0x30, 0x31, 0xf1, 0x33, 0xf3, 0xf2, 0x32, 0x36, 0xf6, 0xf7, 0x37, 0xf5, 0x35, 0x34, 0xf4,
  0x3c, 0xfc, 0xfd, 0x3d, 0xff, 0x3f, 0x3e, 0xfe, 0xfa, 0x3a, 0x3b, 0xfb, 0x39, 0xf9, 0xf8, 0x38,
  0x28, 0xe8, 0xe9, 0x29, 0xeb, 0x2b, 0x2a, 0xea, 0xee, 0x2e, 0x2f, 0xef, 0x2d, 0xed, 0xec, 0x2c,
  0xe4, 0x24, 0x25, 0xe5, 0x27, 0xe7, 0xe6, 0x26, 0x22, 0xe2, 0xe3, 0x23, 0xe1, 0x21, 0x20, 0xe0,
  0xa0, 0x60, 0x61, 0xa1, 0x63, 0xa3, 0xa2, 0x62, 0x66, 0xa6, 0xa7, 0x67, 0xa5, 0x65, 0x64, 0xa4,
  0x6c, 0xac, 0xad, 0x6d, 0xaf, 0x6f, 0x6e, 0xae, 0xaa, 0x6a, 0x6b, 0xab, 0x69, 0xa9, 0xa8, 0x68,
  0x78, 0xb8, 0xb9, 0x79, 0xbb, 0x7b, 0x7a, 0xba, 0xbe, 0x7e, 0x7f, 0xbf, 0x7d, 0xbd, 0xbc, 0x7c,
  0xb4, 0x74, 0x75, 0xb5, 0x77, 0xb7, 0xb6, 0x76, 0x72, 0xb2, 0xb3, 0x73, 0xb1, 0x71, 0x70, 0xb0,
  0x50, 0x90, 0x91, 0x51, 0x93, 0x53, 0x52, 0x92, 0x96, 0x56, 0x57, 0x97, 0x55, 0x95, 0x94, 0x54,
  0x9c, 0x5c, 0x5d, 0x9d, 0x5f, 0x9f, 0x9e, 0x5e, 0x5a, 0x9a, 0x9b, 0x5b, 0x99, 0x59, 0x58, 0x98,
  0x88, 0x48, 0x49, 0x89, 0x4b, 0x8b, 0x8a, 0x4a, 0x4e, 0x8e, 0x8f, 0x4f, 0x8d, 0x4d, 0x4c, 0x8c,
  0x44, 0x84, 0x85, 0x45, 0x87, 0x47, 0x46, 0x86, 0x82, 0x42, 0x43, 0x83, 0x41, 0x81, 0x80, 0x40,
]);

/**
 * Modbus CRC16 using lookup tables (init 0xFF/0xFF).
 * Result is `(lo << 8) | hi`, written big-endian into the frame.
 *
 * @param {Buffer|Uint8Array} data
 * @returns {number}
 */
function modbusCrc16(data) {
  let crcHi = 0xff;
  let crcLo = 0xff;
  for (let i = 0; i < data.length; i++) {
    const idx = (crcHi ^ data[i]) & 0xff;
    crcHi = (crcLo ^ CRC_HI[idx]) & 0xff;
    crcLo = CRC_LO[idx];
  }
  return ((crcLo << 8) | crcHi) & 0xffff;
}

/**
 * Build a read-command frame (old protocol, no infoData).
 *
 * @param {number} address DP address (e.g. DP_ANALOG_QUANTITY)
 * @param {number} [readCount=0]
 * @param {number} [frameHead=FRAME_HEAD]
 * @returns {Buffer}
 */
function buildReadFrame(address, readCount = 0, frameHead = FRAME_HEAD) {
  const buf = Buffer.alloc(MIN_FRAME_SIZE);
  buf[0] = frameHead;
  buf[1] = 0x00; // version (old protocol)
  buf[2] = DEVICE_ADDR;
  buf[3] = FUNC_READ;
  buf.writeUInt16BE(address & 0xffff, 4);
  buf.writeUInt16BE(readCount & 0xffff, 6);
  const crc = modbusCrc16(buf.subarray(0, 8));
  buf.writeUInt16BE(crc, 8);
  buf[10] = FRAME_TAIL;
  return buf;
}

/**
 * Verify the CRC16 of a complete frame.
 * @param {Buffer} data
 * @returns {boolean}
 */
function verifyCrc(data) {
  if (!data || data.length < MIN_FRAME_SIZE) return false;
  const expected = data.readUInt16BE(data.length - 3);
  return modbusCrc16(data.subarray(0, data.length - 3)) === expected;
}

/**
 * From the first response packet, compute the total expected length
 * (used for reassembling notifications).
 * @param {Buffer} firstPacket
 * @returns {number|null}
 */
function expectedResponseLength(firstPacket) {
  if (!firstPacket || firstPacket.length < 8) return null;
  return firstPacket.readUInt16BE(6) + 11;
}

/**
 * Parse a complete response frame.
 * Returns null on invalid frame or error response.
 *
 * @param {Buffer} data
 * @returns {{
 *   version: number,
 *   address: number,
 *   functionCode: number,
 *   startAddress: number,
 *   dataLength: number,
 *   data: Buffer,
 *   raw: Buffer,
 * }|null}
 */
function parseFrame(data) {
  if (!data || data.length < MIN_FRAME_SIZE) return null;
  if (data[0] !== FRAME_HEAD && data[0] !== FRAME_HEAD_ALT) return null;
  if (data[data.length - 1] !== FRAME_TAIL) return null;
  const func = data[3];
  if (func === FUNC_ERROR) return null;
  const dataLength = data.readUInt16BE(6);
  if (data.length < dataLength + 11) return null;
  return {
    version: data[1],
    address: data[2],
    functionCode: func,
    startAddress: data.readUInt16BE(4),
    dataLength,
    data: data.subarray(8, 8 + dataLength),
    raw: data,
  };
}

/**
 * Parse a 2-byte signed current (sign + decimal flag in top bits of byte 0).
 * Bit 7: sign (1 = negative). Bit 6: decimal flag (1 = divide by 10).
 *
 * @param {Buffer} data
 * @param {number} offset
 * @returns {{ current: number, offset: number }}
 */
function parseCurrentNegative(data, offset) {
  const b0 = data[offset];
  const b1 = data[offset + 1];
  const isNegative = (b0 & 0x80) !== 0;
  const hasDecimal = (b0 & 0x40) !== 0;
  const raw = b1 | ((b0 & 0x3f) << 8);
  let current = hasDecimal ? raw / 10.0 : raw;
  if (isNegative) current = -current;
  return { current, offset: offset + 2 };
}

/**
 * Parse Analog Quantity payload (DP 140 / 0x8C).
 * `data` is the DATA portion of the frame (after header, before CRC).
 * Returns null on parse failure.
 *
 * @param {Buffer} data
 */
function parseAnalogQuantity(data) {
  try {
    if (!data || data.length < 1) return null;
    let off = 0;
    const cellCount = data[off++];
    const cellVoltages = [];
    for (let i = 0; i < cellCount; i++) {
      cellVoltages.push(data.readUInt16BE(off) / 1000.0);
      off += 2;
    }
    const temperatureCount = data[off++];
    const mosTemperature = (data.readUInt16BE(off) - 2730) / 10.0;
    off += 2;
    const pcbTemperature = (data.readUInt16BE(off) - 2730) / 10.0;
    off += 2;
    const cellTemperatures = [];
    for (let i = 0; i < temperatureCount - 2; i++) {
      cellTemperatures.push((data.readUInt16BE(off) - 2730) / 10.0);
      off += 2;
    }
    const cur = parseCurrentNegative(data, off);
    const current = cur.current;
    off = cur.offset;
    const moduleVoltage = data.readUInt16BE(off) / 100.0; off += 2;
    const remainingCapacity = data.readUInt16BE(off) / 10.0; off += 2;
    const totalCapacity = data.readUInt16BE(off) / 10.0; off += 2;
    const cycleNumber = data.readUInt16BE(off); off += 2;
    const designCapacity = data.readUInt16BE(off) / 10.0; off += 2;
    const soc = data.readUInt16BE(off); off += 2;

    const out = {
      cellCount,
      cellVoltages,
      temperatureCount,
      mosTemperature,
      pcbTemperature,
      cellTemperatures,
      current,
      moduleVoltage,
      remainingCapacity,
      totalCapacity,
      cycleNumber,
      designCapacity,
      soc,
      soh: null,
      cumulativeCapacity: null,
      remainingTimeMin: null,
      balanceCurrent: null,
    };

    // New-version extension (>= 18 bytes remaining)
    if (data.length - off >= 18) {
      out.soh = data.readUInt16BE(off); off += 2;
      out.cumulativeCapacity = data.readUInt32BE(off) / 10.0; off += 4;
      out.remainingTimeMin = data.readInt32BE(off); off += 4;
      off += 6; // 3 reserved uint16
      const bal = parseCurrentNegative(data, off);
      out.balanceCurrent = bal.current;
    }

    return out;
  } catch (_e) {
    return null;
  }
}

/**
 * Parse Product Info payload (DP 146 / 0x92).
 * Expects exactly 60 bytes.
 *
 * @param {Buffer} data
 */
function parseProductInfo(data) {
  if (!data || data.length !== 60) return null;
  const decode = (slice) =>
    slice.toString("ascii").replace(/ +$/g, "").trim();
  return {
    firmwareVersion: decode(data.subarray(0, 20)),
    manufacturerName: decode(data.subarray(20, 40)),
    serialNumber: decode(data.subarray(40, 60)),
  };
}

const PROTECTION_BITS_R1 = [
  "cell_overcharge",
  "cell_overdischarge",
  "total_overcharge",
  "total_overdischarge",
  "charge_overcurrent",
  "discharge_overcurrent",
  "hardware",
  "charge_voltage_high",
];
const PROTECTION_BITS_R2 = [
  "charge_high_temp",
  "discharge_high_temp",
  "charge_low_temp",
  "discharge_low_temp",
  "mos_high_temp",
  "env_high_temp",
  "env_low_temp",
];
const FAULT_BITS_R5 = ["cell", "charge_mos", "discharge_mos", "temperature"];

function bitsToFlags(byte, names) {
  const flags = [];
  for (let i = 0; i < names.length; i++) {
    if ((byte & (1 << i)) !== 0) flags.push(names[i]);
  }
  return flags;
}

/**
 * Parse Warning Info payload (DP 141 / 0x8D).
 *
 * @param {Buffer} data
 */
function parseWarningInfo(data) {
  try {
    if (!data || data.length < 1) return null;
    let off = 0;
    const cellCount = data[off++];
    const cellStates = [];
    for (let i = 0; i < cellCount; i++) cellStates.push(data[off++]);

    const temperatureCount = data[off++];
    const mosTemperatureState = data[off++];
    const pcbTemperatureState = data[off++];
    const cellTempStates = [];
    for (let i = 0; i < temperatureCount - 2; i++) cellTempStates.push(data[off++]);

    const chargeCurrentState = data[off++];
    const voltageState = data[off++];
    const dischargeCurrentState = data[off++];
    const batteryMode = data[off++];
    const statusRegister1 = data[off++];
    const statusRegister2 = data[off++];
    const statusRegister3 = data[off++];
    off++; // reserved
    const statusRegister5 = data[off++];
    off += 2; // reserved
    const warningRegister1 = data[off++];
    const warningRegister2 = data[off++];

    const balanceStates = [];
    const nBytes = Math.ceil(cellCount / 8);
    for (let i = 0; i < nBytes; i++) {
      const byteVal = data[off++];
      for (let bit = 0; bit < 8; bit++) {
        const idx = i * 8 + bit;
        if (idx < cellCount) balanceStates.push((byteVal & (1 << bit)) !== 0);
      }
    }

    return {
      cellCount,
      cellStates,
      temperatureCount,
      mosTemperatureState,
      pcbTemperatureState,
      cellTempStates,
      chargeCurrentState,
      voltageState,
      dischargeCurrentState,
      batteryMode,
      statusRegister1,
      statusRegister2,
      statusRegister3,
      statusRegister5,
      warningRegister1,
      warningRegister2,
      balanceStates,
      protections: [
        ...bitsToFlags(statusRegister1, PROTECTION_BITS_R1),
        ...bitsToFlags(statusRegister2, PROTECTION_BITS_R2),
      ],
      faults: bitsToFlags(statusRegister5, FAULT_BITS_R5),
      warnings: [
        ...bitsToFlags(warningRegister1, PROTECTION_BITS_R1),
        ...bitsToFlags(warningRegister2, PROTECTION_BITS_R2),
      ],
    };
  } catch (_e) {
    return null;
  }
}

module.exports = {
  // UUIDs
  SERVICE_UUID,
  WRITE_UUID,
  NOTIFY_UUID,
  AUTH_UUID,
  // constants
  FRAME_HEAD,
  FRAME_HEAD_ALT,
  FRAME_TAIL,
  FUNC_READ,
  FUNC_WRITE,
  FUNC_ERROR,
  DEVICE_ADDR,
  MIN_FRAME_SIZE,
  AUTH_KEY,
  DEVICE_NAME_PREFIXES,
  DP_ANALOG_QUANTITY,
  DP_WARNING_INFO,
  DP_PRODUCT_INFO,
  // functions
  modbusCrc16,
  buildReadFrame,
  verifyCrc,
  expectedResponseLength,
  parseFrame,
  parseCurrentNegative,
  parseAnalogQuantity,
  parseProductInfo,
  parseWarningInfo,
};
