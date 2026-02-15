const BTSensor = require("../BTSensor");

function sumByteArray(byteArray) {
  let sum = 0;
  for (let i = 0; i < byteArray.length; i++) {
    sum += byteArray[i];
  }
  return sum;
}

function checkSum(buffer) {
  if (buffer.length < 5) {
    console.log(
      `Can't checksum ${buffer}. Invalid buffer. Buffer must be at least 5 bytes long.`
    );
    return false;
  }
  const checksum = buffer.readUInt16BE(buffer.length - 3);
  let sum = sumByteArray(
    Uint8Array.prototype.slice.call(buffer, 2, buffer.length - 3)
  );
  if (0xffff - sum + 1 == checksum) return true;
  sum = sumByteArray(
    Uint8Array.prototype.slice.call(buffer, 2, buffer.length - 2)
  );
  return 0xffff - sum + 1 == checksum;
}

class JBDBMS extends BTSensor {
  static Domain = BTSensor.SensorDomains.electrical;

  static TX_RX_SERVICE = "0000ff00-0000-1000-8000-00805f9b34fb";
  static NOTIFY_CHAR_UUID = "0000ff01-0000-1000-8000-00805f9b34fb";
  static WRITE_CHAR_UUID = "0000ff02-0000-1000-8000-00805f9b34fb";

  static identify(device) {
    return null;
  }
  static ImageFile = "JBDBMS.webp";

  jbdCommand(command) {
    return [0xdd, 0xa5, command, 0x00, 0xff, 0xff - (command - 1), 0x77];
  }

  async sendReadFunctionRequest(command) {
    this.debug(`${this.getName()}::sendReadFunctionRequest sending ${command}`);
    return await this.txChar.writeValueWithoutResponse(
      Buffer.from(this.jbdCommand(command))
    );
  }

  async initSchema() {
    this.debug(`${this.getName()}::initSchema`);

    super.initSchema();
    this.addDefaultParam("batteryID");

    this.addDefaultPath("voltage", "electrical.batteries.voltage").read = (
      buffer
    ) => {
      return buffer.readUInt16BE(4) / 100;
    };

    this.addDefaultPath("current", "electrical.batteries.current").read = (
      buffer
    ) => {
      return buffer.readInt16BE(6) / 100;
    };

    this.addDefaultPath(
      "remainingCapacity",
      "electrical.batteries.capacity.remaining"
    ).read = (buffer) => {
      return (buffer.readUInt16BE(8) / 100) * 3600;
    };

    this.addDefaultPath(
      "capacity",
      "electrical.batteries.capacity.actual"
    ).read = (buffer) => {
      return (buffer.readUInt16BE(10) / 100) * 3600;
    };

    this.addDefaultPath("cycles", "electrical.batteries.cycles").read = (
      buffer
    ) => {
      return buffer.readUInt16BE(12);
    };

    this.addMetadatum("protectionStatus", "", "Protection Status", (buffer) => {
      const bits = buffer.readUInt16BE(20).toString(2);
      return {
        singleCellOvervolt: bits[0] == "1",
        singleCellUndervolt: bits[1] == "1",
        packOvervolt: bits[2] == "1",
        packUndervolt: bits[3] == "1",
        chargeOvertemp: bits[4] == "1",
        chargeUndertemp: bits[5] == "1",
        dischargeOvertemp: bits[6] == "1",
        dischargeUndertemp: bits[7] == "1",
        chargeOvercurrent: bits[8] == "1",
        dischargeOvercurrent: bits[9] == "1",
        shortCircut: bits[10] == "1",
        frontEndDetectionICError: bits[11] == "1",
        softwareLockMOS: bits[12] == "1",
      };
    }).default = "electrical.batteries.{batteryID}.protectionStatus";

    this.addDefaultPath(
      "SOC",
      "electrical.batteries.capacity.stateOfCharge"
    ).read = (buffer) => {
      return buffer.readUInt8(23) / 100;
    };

    this.addMetadatum("FET", "", "FET On/Off Status", (buffer) => {
      return buffer.readUInt8(24) != 0;
    }).default = "electrical.batteries.{batteryID}.FETStatus";

    this.addMetadatum("FETCharging", "", "FET Status Charging", (buffer) => {
      return (buffer.readUInt8(24) & 0x1) != 0;
    }).default = "electrical.batteries.{batteryID}.FETStatus.charging";

    this.addMetadatum(
      "FETDischarging",
      "",
      "FET Status Discharging",
      (buffer) => {
        return (buffer.readUInt8(24) & 0x2) != 0;
      }
    ).default = "electrical.batteries.{batteryID}.FETStatus.discharging";

    if (this.numberOfCells == undefined || this.numberOfTemps == undefined) {
      try {
        this.debug(
          `${this.getName()}::initSchema Getting number of cells and temps...`
        );
        // NOTE gatt conn initiated here, in init
        await this.initGATTConnection();
        const cellsAndTemps = await this.getNumberOfCellsAndTemps();
        this.numberOfCells = cellsAndTemps.cells;
        this.numberOfTemps = cellsAndTemps.temps;
      } catch (e) {
        console.error(e);
        this.numberOfCells = 4;
        this.numberOfTemps = 2;
      }
    }

    for (let i = 0; i < this.numberOfTemps; i++) {
      this.addMetadatum(
        `temp${i}`,
        "K",
        `Temperature${i + 1} reading`,
        (buffer) => {
          return buffer.readUInt16BE(27 + i * 2) / 10;
        }
      ).default = `electrical.batteries.{batteryID}.Temperature${i + 1}`;
    }

    for (let i = 0; i < this.numberOfCells; i++) {
      this.addMetadatum(
        `cell${i}Voltage`,
        "V",
        `Cell ${i + 1} voltage`,
        (buffer) => {
          return buffer.readUInt16BE(4 + i * 2) / 1000;
        }
      ).default = `electrical.batteries.{batteryID}.cell${i}.voltage`;
      this.addMetadatum(
        `cell${i}Balance`,
        "",
        `Cell ${i + 1} balance`
      ).default = `electrical.batteries.{batteryID}.cell${i}.balance`;
    }
  }

  hasGATT() {
    return true;
  }

  usingGATT() {
    return true;
  }
  // FIXME not really needed:
  async initGATTNotifications() {
    this.debug(`${this.getName()}::initGATTNotifications`);
  }

  async emitGATT() {
    this.debug(`${this.getName()}::emitGATT`);
    try {
      await this.getAndEmitBatteryInfo();
    } catch (e) {
      console.error(e);
      this.debug(
        `${this.getName()}::emitGATT Failed to emit battery info for ${this.getName()}: ${e}`
      );
    }
    // setTimeout(async () => {
    try {
      await this.getAndEmitCellVoltages();
    } catch (e) {
      console.error(e);
      this.debug(
        `${this.getName()}::emitGATT Failed to emit Cell Voltages for ${this.getName()}: ${e}`
      );
    }
    // }, 10000);
  }

  async getNumberOfCellsAndTemps() {
    const b = await this.getBuffer(0x3);
    return { cells: b[25], temps: b[26] };
  }

  getBuffer(command) {
    return new Promise(async (resolve, reject) => {
      const r = await this.sendReadFunctionRequest(command);
      let result = Buffer.alloc(256);
      let offset = 0;
      let datasize = -1;
      const timer = setTimeout(() => {
        clearTimeout(timer);
        reject(
          new Error(
            `Response timed out (+30s) from JBDBMS device ${this.getName()}. `
          )
        );
      }, 30000);

      const valChanged = async (buffer) => {
        if (offset == 0) {
          //first packet
          if (buffer[0] !== 0xdd || buffer.length < 5 || buffer[1] !== command)
            reject(`Invalid buffer from ${this.getName()}, not processing.`);
          else datasize = buffer[3];
        }
        buffer.copy(result, offset);
        if (
          buffer[buffer.length - 1] == 0x77 &&
          offset + buffer.length - 7 == datasize
        ) {
          result = Uint8Array.prototype.slice.call(
            result,
            0,
            offset + buffer.length
          );
          this.rxChar.removeAllListeners();
          clearTimeout(timer);
          if (!checkSum(result))
            reject(`Invalid checksum from ${this.getName()}, not processing.`);

          resolve(result);
        }
        offset += buffer.length;
      };
      this.rxChar.on("valuechanged", valChanged);
    });
  }

  async initGATTConnection(isReconnecting = false) {

    if (this.rxChar)
      try {
        this.rxChar.removeAllListeners();
        await this.rxChar.stopNotifications();
      } catch (e) {
        console.error(e);
        this.debug(`error while stopping notifications`);
        this.debug(e);
      }

    try {
      await super.initGATTConnection(isReconnecting);
      const gattServer = await this.getGATTServer();

      this.txRxService = await gattServer.getPrimaryService(
        this.constructor.TX_RX_SERVICE
      );
      this.rxChar = await this.txRxService.getCharacteristic(
        this.constructor.NOTIFY_CHAR_UUID
      );
      this.txChar = await this.txRxService.getCharacteristic(
        this.constructor.WRITE_CHAR_UUID
      );
      await this.rxChar.startNotifications();
    } catch (e) {
      console.error(e);
      this.setError(e.message);
    }

    try {
      // FIXME not really needed?
      await this.getBuffer(0x03);
    } catch (e) {
      console.error(e);
      this.debug(`Error encountered calling getBuffer(0x03)`);
    }
    //this.debug(`(${this.getName()}) Connections: ${this.connections++}`)
  }

  async getAndEmitBatteryInfo() {
    return this.getBuffer(0x03).then((buffer) => {
      [
        "current",
        "voltage",
        "remainingCapacity",
        "capacity",
        "cycles",
        "protectionStatus",
        "SOC",
        "FET",
      ].forEach((tag) => this.emitData(tag, buffer));
      for (let i = 0; i < this.numberOfTemps; i++) {
        this.emitData(`temp${i}`, buffer);
      }

      // cells 0-15 - read bits right to left
      let balanceCells0to15 = buffer.readUInt16BE(16);
      for (let i = 0; i < Math.min(16, this.numberOfCells); i++) {
        const bit = (balanceCells0to15 >> i) & 1; // right-to-left
        this.emit(`cell${i}Balance`, bit);
      }

      // cells 16-31 - read bits right to left
      let balanceCells16to31 = buffer.readUInt16BE(18);
      for (let i = 0; i < Math.min(16, this.numberOfCells - 16); i++) {
        const bit = (balanceCells16to31 >> i) & 1; // right-to-left
        this.emit(`cell${16 + i}Balance`, bit);
      }
    });
  }

  async getAndEmitCellVoltages() {
    return this.getBuffer(0x4).then((buffer) => {
      for (let i = 0; i < this.numberOfCells; i++) {
        this.emitData(`cell${i}Voltage`, buffer);
      }
    });
  }

  async initGATTInterval() {
    this.debug(
      `${this.getName()}::initGATTInterval pollFreq=${this?.pollFreq}`
    );
    this.intervalID = setInterval(
      async () => {
        this._error = false;
        if (!(await this.device.isConnected())) {
          await this.initGATTConnection(true);
        }
        await this.emitGATT();
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

    // FIXME added this. needed any more?
    if (this.intervalID) {
      clearInterval(this.intervalID);
    }

    await this.stopGATTNotifications(this.rxChar);
    await super.deactivateGATT();
  }
}

module.exports = JBDBMS;
