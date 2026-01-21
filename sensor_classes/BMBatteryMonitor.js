const BTSensor = require("../BTSensor");
const crypto = require("crypto");

class BMBatteryMonitor extends BTSensor {
  static Domain = BTSensor.SensorDomains.electrical;
  
  static cryptKey6 = Buffer.from([
  0x6c, 0x65, 0x61, 0x67, 0x65, 0x6e, 0x64, 0xff, 0xfe, 0x30, 0x31, 0x30, 0x30, 0x30, 0x30, 0x39
]);

  static cryptKey7 = Buffer.from([
  0x6c, 0x65, 0x61, 0x67, 0x65, 0x6e, 0x64, 0xff, 0xfe, 0x30, 0x31, 0x30, 0x30, 0x30, 0x30, 0x40
]);

  static cryptKey2 = Buffer.from([
  0x6c, 0x65, 0x61, 0x67, 0x65, 0x6e, 0x64, 0xff, 0xfe, 0x31, 0x38, 0x38, 0x32, 0x34, 0x36, 0x36
]);

  static COMMAND_HEX = "d1550700000000000000000000000000";

  static async identify(device) {
    const name = await this.getDeviceProp(device, "Name");

    if (name && /BM[2|6|7]$/.test(name)) return this;
    else return null;
  }
  static ImageFile = "bm6.webp";

    createCipher(key) {
        const iv = Buffer.alloc(16, 0);
        const cipher = crypto.createCipheriv("aes-128-cbc", key, iv);
        cipher.setAutoPadding(false);
        return cipher;
    }

    encryptCommand(key) {
        const cipher = this.createCipher(key);
        const plaintext = Buffer.from(COMMAND_HEX, "hex");
        return Buffer.concat([cipher.update(plaintext), cipher.final()]);
    }

 decryptPayload(payload, key) {
  const cipher = this.createCipher(key);
  const decrypted = Buffer.concat([cipher.update(payload), cipher.final()]);
  return decrypted.toString("hex");
}


  hasGATT() {
    return true;
  }
  usingGATT() {
    return true;
  }
  emitGATT() {
    this.characteristic
      .readValue()
      .then((buffer) => this.emitValuesFrom(buffer));
  }

  initSchema() {
    super.initSchema();
    this.getGATTParams()["useGATT"].default = true;
    
    this.addDefaultParam("batteryID");

    this.addDefaultPath("voltage", "electrical.batteries.voltage").read = (
    buffer
    ) => {
    return buffer.readUInt16BE(20) / 100;
    };

    this.addDefaultPath("current", "electrical.batteries.current").read = (
    buffer
    ) => {
    return buffer.readInt16BE(22) / 100;
    }; 

    this.addDefaultPath("temperature", "electrical.batteries.temperature").read = (
        buffer
    ) => {
        return buffer.readInt16BE(22) / 100;
    }; 
      
  }

  async initGATTConnection(isReconnecting) {
    await super.initGATTConnection(isReconnecting);
    const gattServer = await this.getGATTServer();
    const service = await gattServer.getPrimaryService(
      "0000ffe0-0000-1000-8000-00805f9b34fb"
    );
    this.write = await service.getCharacteristic(
      "0000ffe3-0000-1000-8000-00805f9b34fb"
    );
    this.read = await service.getCharacteristic(
      "0000ffe4-0000-1000-8000-00805f9b34fb"
    );
  }
  async initGATTNotifications() {
    await this.read.startNotifications();
    this.read.on("valuechanged", (buffer) => {
      this.emitValuesFrom(buffer);
    });
  }

  async deactivateGATT() {
    await this.stopGATTNotifications(this.read);
    await super.deactivateGATT();
  }
}
module.exports = BMBatteryMonitor;
