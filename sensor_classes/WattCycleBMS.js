"use strict";

const BTSensor = require("../BTSensor");
const proto = require("./wattcycle/protocol.js");

const C_TO_K = 273.15;
const AH_TO_AS = 3600;

class WattCycleBMS extends BTSensor {
  static Domain = BTSensor.SensorDomains.electrical;

  static SERVICE_UUID = proto.SERVICE_UUID;
  static NOTIFY_CHAR_UUID = proto.NOTIFY_UUID;
  static WRITE_CHAR_UUID = proto.WRITE_UUID;
  static AUTH_CHAR_UUID = proto.AUTH_UUID;

  static identify(device) {
    return null;
  }

  async initSchema() {
    super.initSchema();
    this.addDefaultParam("batteryID");

    this.addDefaultPath("voltage", "electrical.batteries.voltage").read = (aq) =>
      aq.moduleVoltage;

    this.addDefaultPath("current", "electrical.batteries.current").read = (aq) =>
      aq.current;

    this.addDefaultPath(
      "remainingCapacity",
      "electrical.batteries.capacity.remaining"
    ).read = (aq) => aq.remainingCapacity * AH_TO_AS;

    this.addDefaultPath(
      "capacity",
      "electrical.batteries.capacity.actual"
    ).read = (aq) => aq.totalCapacity * AH_TO_AS;

    this.addDefaultPath(
      "designCapacity",
      "electrical.batteries.capacity.nominal"
    ).read = (aq) => aq.designCapacity * AH_TO_AS;

    this.addDefaultPath("cycles", "electrical.batteries.cycles").read = (aq) =>
      aq.cycleNumber;

    this.addDefaultPath(
      "SOC",
      "electrical.batteries.capacity.stateOfCharge"
    ).read = (aq) => aq.soc / 100;

    this.addDefaultPath(
      "SOH",
      "electrical.batteries.capacity.stateOfHealth"
    ).read = (aq) => (aq.soh == null ? null : aq.soh / 100);

    this.addDefaultPath(
      "temperature",
      "electrical.batteries.temperature"
    ).read = (aq) => {
      const temps = aq.cellTemperatures.length
        ? aq.cellTemperatures
        : [aq.mosTemperature, aq.pcbTemperature];
      return Math.max(...temps) + C_TO_K;
    };

    this.addMetadatum(
      "mosTemperature",
      "K",
      "MOSFET temperature",
      (aq) => aq.mosTemperature + C_TO_K
    ).default = "electrical.batteries.{batteryID}.mosTemperature";

    this.addMetadatum(
      "pcbTemperature",
      "K",
      "PCB temperature",
      (aq) => aq.pcbTemperature + C_TO_K
    ).default = "electrical.batteries.{batteryID}.pcbTemperature";

    if (this.numberOfCells == undefined || this.numberOfTemps == undefined) {
      try {
        await this.initGATTConnection();
        const aq = await this._readAnalogQuantity();
        this.numberOfCells = aq.cellCount;
        this.numberOfTemps = Math.max(0, aq.cellTemperatures.length);
      } catch (e) {
        console.error(e);
        this.numberOfCells = 4;
        this.numberOfTemps = 2;
      }
    }

    for (let i = 0; i < this.numberOfCells; i++) {
      this.addMetadatum(
        `cell${i}Voltage`,
        "V",
        `Cell ${i + 1} voltage`,
        (aq) => aq.cellVoltages[i]
      ).default = `electrical.batteries.{batteryID}.cell${i}.voltage`;
      this.addMetadatum(
        `cell${i}Balance`,
        "",
        `Cell ${i + 1} balance state`
      ).default = `electrical.batteries.{batteryID}.cell${i}.balance`;
    }
    for (let i = 0; i < this.numberOfTemps; i++) {
      this.addMetadatum(
        `cellTemp${i}`,
        "K",
        `Cell temperature ${i + 1}`,
        (aq) => aq.cellTemperatures[i] + C_TO_K
      ).default = `electrical.batteries.{batteryID}.Temperature${i + 1}`;
    }

    this.addMetadatum(
      "protectionStatus",
      "",
      "Active protections",
      (wi) => ({
        protections: wi.protections,
        faults: wi.faults,
        warnings: wi.warnings,
      })
    ).default = "electrical.batteries.{batteryID}.protectionStatus";
  }

  hasGATT() {
    return true;
  }

  usingGATT() {
    return true;
  }

  async initGATTNotifications() {
    this.debug(`${this.getName()}::initGATTNotifications`);
  }

  async initGATTConnection(isReconnecting = false) {
    if (this.rxChar) {
      try {
        this.rxChar.removeAllListeners();
        await this.rxChar.stopNotifications();
      } catch (e) {
        this.debug(`error stopping notifications: ${e.message}`);
      }
    }

    try {
      await super.initGATTConnection(isReconnecting);
      const gattServer = await this.getGATTServer();
      this.btService = await gattServer.getPrimaryService(this.constructor.SERVICE_UUID);
      this.rxChar = await this.btService.getCharacteristic(this.constructor.NOTIFY_CHAR_UUID);
      this.txChar = await this.btService.getCharacteristic(this.constructor.WRITE_CHAR_UUID);

      try {
        this.authChar = await this.btService.getCharacteristic(this.constructor.AUTH_CHAR_UUID);
      } catch (e) {
        this.debug(`Auth characteristic not found: ${e.message}`);
        this.authChar = null;
      }

      await this.rxChar.startNotifications();

      if (this.authChar) {
        try {
          await this.authChar.writeValue(Buffer.from(proto.AUTH_KEY));
        } catch (e) {
          this.debug(`Auth write failed (continuing): ${e.message}`);
        }
      }

      this.frameHead = await this._detectFrameHead();
    } catch (e) {
      console.error(e);
      this.setError(e.message);
    }
  }

  async _detectFrameHead() {
    for (const head of [proto.FRAME_HEAD, proto.FRAME_HEAD_ALT]) {
      try {
        await this._sendRead(proto.DP_PRODUCT_INFO, 3000, head);
        this.debug(`${this.getName()} frame head = 0x${head.toString(16)}`);
        return head;
      } catch (e) {
        this.debug(`Frame head 0x${head.toString(16)} did not respond: ${e.message}`);
      }
    }
    return proto.FRAME_HEAD;
  }

  /**
   * Send a read frame and reassemble notifications until the response is complete.
   *
   * @param {number} dpAddress
   * @param {number} [timeoutMs=10000]
   * @param {number} [head]
   * @returns {Promise<{frame: object, payload: Buffer}>}
   */
  _sendRead(dpAddress, timeoutMs = 10000, head = undefined) {
    const frameHead = head ?? this.frameHead ?? proto.FRAME_HEAD;
    return new Promise(async (resolve, reject) => {
      if (!this.rxChar || !this.txChar) {
        reject(new Error(`${this.getName()}::_sendRead chars unavailable`));
        return;
      }
      const chunks = [];
      let total = 0;
      let expected = -1;
      let settled = false;

      const cleanup = () => {
        if (this.rxChar) this.rxChar.removeListener("valuechanged", onValue);
        clearTimeout(timer);
      };

      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(new Error(`Response timed out from ${this.getName()} (DP 0x${dpAddress.toString(16)})`));
      }, timeoutMs);

      const onValue = (buffer) => {
        if (settled) return;
        if (chunks.length === 0) {
          if (buffer.length < 8) return;
          if (buffer[0] !== proto.FRAME_HEAD && buffer[0] !== proto.FRAME_HEAD_ALT) return;
          if (buffer.readUInt16BE(4) !== dpAddress) return;
          expected = proto.expectedResponseLength(buffer);
          if (expected == null) return;
        }
        chunks.push(buffer);
        total += buffer.length;
        if (total >= expected) {
          const full = Buffer.concat(chunks, total).subarray(0, expected);
          settled = true;
          cleanup();
          if (!proto.verifyCrc(full)) {
            reject(new Error(`Bad CRC from ${this.getName()} on DP 0x${dpAddress.toString(16)}`));
            return;
          }
          const frame = proto.parseFrame(full);
          if (!frame) {
            reject(new Error(`Invalid frame from ${this.getName()} on DP 0x${dpAddress.toString(16)}`));
            return;
          }
          resolve({ frame, payload: frame.data });
        }
      };

      this.rxChar.on("valuechanged", onValue);
      try {
        const tx = proto.buildReadFrame(dpAddress, 0, frameHead);
        await this.txChar.writeValueWithoutResponse(Buffer.from(tx));
      } catch (e) {
        if (settled) return;
        settled = true;
        cleanup();
        reject(e);
      }
    });
  }

  async _readAnalogQuantity() {
    const { payload } = await this._sendRead(proto.DP_ANALOG_QUANTITY);
    const aq = proto.parseAnalogQuantity(payload);
    if (!aq) throw new Error(`Failed to parse Analog Quantity for ${this.getName()}`);
    return aq;
  }

  async _readWarningInfo() {
    const { payload } = await this._sendRead(proto.DP_WARNING_INFO);
    const wi = proto.parseWarningInfo(payload);
    if (!wi) throw new Error(`Failed to parse Warning Info for ${this.getName()}`);
    return wi;
  }

  async emitGATT() {
    try {
      const aq = await this._readAnalogQuantity();
      [
        "voltage",
        "current",
        "remainingCapacity",
        "capacity",
        "designCapacity",
        "cycles",
        "SOC",
        "SOH",
        "temperature",
        "mosTemperature",
        "pcbTemperature",
      ].forEach((tag) => this.emitData(tag, aq));

      const cellCount = Math.min(this.numberOfCells ?? aq.cellCount, aq.cellCount);
      for (let i = 0; i < cellCount; i++) this.emitData(`cell${i}Voltage`, aq);

      const tCount = Math.min(this.numberOfTemps ?? aq.cellTemperatures.length, aq.cellTemperatures.length);
      for (let i = 0; i < tCount; i++) this.emitData(`cellTemp${i}`, aq);
    } catch (e) {
      console.error(e);
      this.debug(`${this.getName()}::emitGATT analog read failed: ${e.message}`);
    }

    try {
      const wi = await this._readWarningInfo();
      this.emitData("protectionStatus", wi);
      const limit = Math.min(this.numberOfCells ?? wi.cellCount, wi.balanceStates.length);
      for (let i = 0; i < limit; i++) {
        this.emit(`cell${i}Balance`, wi.balanceStates[i] ? 1 : 0);
      }
    } catch (e) {
      console.error(e);
      this.debug(`${this.getName()}::emitGATT warning read failed: ${e.message}`);
    }
  }

  async initGATTInterval() {
    this.debug(`${this.getName()}::initGATTInterval pollFreq=${this?.pollFreq}`);
    this.intervalID = setInterval(
      async () => {
        this._error = false;
        try {
          if (!(await this.device.isConnected())) {
            await this.initGATTConnection(true);
          }
          await this.emitGATT();
        } catch (e) {
          this.setError(e.message);
        }
      },
      (this?.pollFreq ?? 40) * 1000
    );
    try {
      await this.emitGATT();
    } catch (e) {
      console.error(e);
      this.setError(e.message);
    }
  }

  async deactivateGATT() {
    this.debug(`${this.getName()}::deactivateGATT`);
    if (this.intervalID) {
      clearInterval(this.intervalID);
      this.intervalID = null;
    }
    await this.stopGATTNotifications(this.rxChar);
    await super.deactivateGATT();
  }
}

module.exports = WattCycleBMS;
