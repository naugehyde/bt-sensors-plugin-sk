const BTSensor = require("../BTSensor");

/**
 * HSC14F Battery Management System Sensor Class
 * 
 * Manufacturer: BMC (HumsiENK branded)
 * Protocol: Custom BLE protocol using AA prefix commands
 * 
 * Discovered protocol details:
 * - TX Handle: 0x000c (write commands to battery)
 * - RX Handle: 0x000e (receive notifications from battery)
 * - Command format: aa [CMD] 00 [CMD] 00
 * - Multi-part responses (some commands send 2-3 notifications)
 * 
 * Key Commands:
 * - 0x00: Handshake
 * - 0x21: Real-time battery data (voltage, current, SOC, temps) - PRIMARY
 * - 0x22: Individual cell voltages
 * - 0x23: Battery status/warnings
 * - 0x20: Configuration data
 * - 0x10: Manufacturer name
 * - 0x11: Model number
 */

class HSC14F extends BTSensor {
  static Domain = BTSensor.SensorDomains.electrical;

  // Discovered actual UUIDs from device
  static TX_RX_SERVICE = "00000001-0000-1000-8000-00805f9b34fb";
  static WRITE_CHAR_UUID = "00000002-0000-1000-8000-00805f9b34fb";
  static NOTIFY_CHAR_UUID = "00000003-0000-1000-8000-00805f9b34fb";

  static identify(device) {
    // HSC14F batteries advertise with this service UUID
    // Further identification would require GATT connection to read manufacturer/model
    return null;
  }

  static ImageFile = "JBDBMS.webp"; // Using similar BMS image for now
  static Manufacturer = "BMC (HumsiENK)";
  static Description = "HSC14F LiFePO4 Battery Management System";

  /**
   * Create HSC14F command
   * Format: aa [CMD] 00 [CMD] 00
   */
  hsc14fCommand(command) {
    return [0xaa, command, 0x00, command, 0x00];
  }

  /**
   * Send command to battery
   * HSC14F requires Write Request (0x12) not Write Command (0x52)
   */
  async sendCommand(command) {
    this.debug(`Sending command 0x${command.toString(16)} to ${this.getName()}`);
    return await this.txChar.writeValue(
      Buffer.from(this.hsc14fCommand(command))
    );
  }

  async initSchema() {
    super.initSchema();
    this.addDefaultParam("batteryID");

    // Voltage
    this.addDefaultPath("voltage", "electrical.batteries.voltage").read = (
      buffer
    ) => {
      // Bytes 3-4: voltage in mV, little-endian
      return buffer.readUInt16LE(3) / 1000;
    };

    // Current
    this.addDefaultPath("current", "electrical.batteries.current").read = (
      buffer
    ) => {
      // Bytes 13-14: current in signed little-endian (needs scaling)
      // Based on capture, appears to be in 0.01A units
      return buffer.readInt16LE(13) / 100;
    };

    // State of Charge
    this.addDefaultPath(
      "SOC",
      "electrical.batteries.capacity.stateOfCharge"
    ).read = (buffer) => {
      // Bytes 11-12: SOC percentage
      return buffer.readUInt8(11) / 100;
    };

    // Temperature 1
    this.addMetadatum("temp1", "K", "Battery Temperature 1", (buffer) => {
      // Temperature readings start around byte 23-27
      // Need to determine exact offset and scaling
      const tempRaw = buffer.readInt16LE(23);
      return 273.15 + tempRaw / 10; // Convert to Kelvin
    }).default = "electrical.batteries.{batteryID}.temperature";

    // Manufacturer (from command 0x10)
    this.addMetadatum(
      "manufacturer",
      "",
      "Battery Manufacturer",
      (buffer) => {
        // Response: aa 10 03 42 4d 43 ...
        // ASCII bytes starting at position 3
        const len = buffer.readUInt8(2);
        return buffer.toString("ascii", 3, 3 + len);
      }
    ).default = "electrical.batteries.{batteryID}.manufacturer";

    // Model (from command 0x11)
    this.addMetadatum("model", "", "Battery Model", (buffer) => {
      // Response: aa 11 0a 42 4d 43 2d 30 34 53 30 30 31 ...
      const len = buffer.readUInt8(2);
      return buffer.toString("ascii", 3, 3 + len);
    }).default = "electrical.batteries.{batteryID}.model";

    // Cell voltages (from command 0x22)
    // Based on capture, appears to be 4S battery (4 cells)
    for (let i = 0; i < 4; i++) {
      this.addMetadatum(
        `cell${i}Voltage`,
        "V",
        `Cell ${i + 1} voltage`,
        (buffer) => {
          // Cell voltages: aa 22 30 6a 0d 58 0d 8f 0d 34 0d ...
          // Starting at byte 3, each cell is 2 bytes little-endian in mV
          return buffer.readUInt16LE(3 + i * 2) / 1000;
        }
      ).default = `electrical.batteries.{batteryID}.cell${i}.voltage`;
    }
  }

  hasGATT() {
    return true;
  }

  usingGATT() {
    return true;
  }

  async initGATTNotifications() {
    // Poll battery every 30 seconds (or configured pollFreq)
    this.intervalID = setInterval(async () => {
      await this.emitGATT();
    }, 1000 * (this?.pollFreq ?? 30));
  }

  async emitGATT() {
    try {
      await this.getAndEmitBatteryInfo();
    } catch (e) {
      this.debug(`Failed to emit battery info for ${this.getName()}: ${e}`);
    }

    // Get cell voltages after a short delay
    setTimeout(async () => {
      try {
        await this.getAndEmitCellVoltages();
      } catch (e) {
        this.debug(`Failed to emit cell voltages for ${this.getName()}: ${e}`);
      }
    }, 2000);
  }

  /**
   * Get buffer response from battery command
   * HSC14F sends multi-part responses for some commands
   */
  async getBuffer(command) {
    let result = Buffer.alloc(256);
    let offset = 0;

    // Set up listener first
    const responsePromise = new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        clearTimeout(timer);
        this.rxChar.removeAllListeners();
        reject(
          new Error(
            `Response timed out (+10s) from HSC14F device ${this.getName()}.`
          )
        );
      }, 10000);

      const valChanged = async (buffer) => {
        // HSC14F responses start with 0xaa followed by command byte
        if (offset === 0 && (buffer[0] !== 0xaa || buffer[1] !== command)) {
          this.debug(
            `Invalid buffer from ${this.getName()}, expected command 0x${command.toString(
              16
            )}, got 0x${buffer[0].toString(16)} 0x${buffer[1].toString(16)}`
          );
          return;
        }

        buffer.copy(result, offset);
        offset += buffer.length;

        // Check if this is the final packet
        // HSC14F responses end with checksum bytes, typically packets are 20 bytes
        // For simplicity, we'll wait for a pause in notifications
        // A more robust implementation would parse the length field
        if (buffer.length < 20 || offset > 60) {
          // Likely complete
          result = Uint8Array.prototype.slice.call(result, 0, offset);
          this.rxChar.removeAllListeners();
          clearTimeout(timer);
          resolve(result);
        }
      };

      // Set up listener BEFORE sending command
      this.rxChar.on("valuechanged", valChanged);
    });

    // Small delay to ensure listener is attached
    await new Promise(r => setTimeout(r, 50));
    
    // Send the command
    try {
      await this.sendCommand(command);
    } catch (err) {
      this.rxChar.removeAllListeners();
      throw err;
    }

    // Wait for response
    return responsePromise;
  }

  async initGATTConnection(isReconnecting = false) {
    await super.initGATTConnection(isReconnecting);
    
    // Set up GATT characteristics
    const gattServer = await this.device.gatt();
    const txRxService = await gattServer.getPrimaryService(
      this.constructor.TX_RX_SERVICE
    );
    this.rxChar = await txRxService.getCharacteristic(
      this.constructor.NOTIFY_CHAR_UUID
    );
    this.txChar = await txRxService.getCharacteristic(
      this.constructor.WRITE_CHAR_UUID
    );
    await this.rxChar.startNotifications();
    
    return this;
  }

  /**
   * Get and emit main battery data (voltage, current, SOC, temp)
   * Uses command 0x21
   */
  async getAndEmitBatteryInfo() {
    return this.getBuffer(0x21).then((buffer) => {
      ["voltage", "current", "SOC", "temp1"].forEach((tag) => {
        this.emitData(tag, buffer);
      });
    });
  }

  /**
   * Get and emit individual cell voltages
   * Uses command 0x22
   */
  async getAndEmitCellVoltages() {
    return this.getBuffer(0x22).then((buffer) => {
      for (let i = 0; i < 4; i++) {
        this.emitData(`cell${i}Voltage`, buffer);
      }
    });
  }

  async initGATTInterval() {
    // Send initial handshake
    try {
      await this.getBuffer(0x00);
    } catch (e) {
      this.debug(`Handshake command failed: ${e.message}`);
    }

    // Send initialization command 0xF5 (required by HSC14F protocol)
    try {
      await this.getBuffer(0xF5);
      this.debug(`Initialization command 0xF5 completed`);
    } catch (e) {
      this.debug(`Initialization command 0xF5 failed: ${e.message}`);
    }

    // Get static info (manufacturer, model)
    try {
      const mfgBuffer = await this.getBuffer(0x10);
      this.emitData("manufacturer", mfgBuffer);
      
      const modelBuffer = await this.getBuffer(0x11);
      this.emitData("model", modelBuffer);
    } catch (e) {
      this.debug(`Failed to get device info: ${e.message}`);
    }

    // Start polling
    await this.emitGATT();
    await this.initGATTNotifications();
  }

  async deactivateGATT() {
    await this.stopGATTNotifications(this.rxChar);
    await super.deactivateGATT();
  }
}

module.exports = HSC14F;