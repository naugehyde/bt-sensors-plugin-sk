const BTSensor = require("../BTSensor");
const crypto = require("crypto");

//69 7e a0 b5 d5 4c f0 24 e7 94 77 23 55 55 41 14

class BMBatteryMonitor extends BTSensor {
  static Domain = BTSensor.SensorDomains.electrical;
  static GATT_SERVICE_UUID = "0000fff0-0000-1000-8000-00805f9b34fb";
  static GATT_READ_UUID = "0000fff4-0000-1000-8000-00805f9b34fb";
  static GATT_WRITE_UUID = "0000fff3-0000-1000-8000-00805f9b34fb";
  static cryptKeys = {
    2: Buffer.from([
    0x6c,
    0x65,
    0x61,
    0x67,
    0x65,
    0x6e,
    0x64,
    0xff,
    0xfe,
    0x31,
    0x38,
    0x38,
    0x32,
    0x34,
    0x36,
    0x36,
  ]),
    6: Buffer.from([
      0x6c,
      0x65,
      0x61,
      0x67,
      0x65,
      0x6e,
      0x64,
      0xff,
      0xfe,
      0x30,
      0x31,
      0x30,
      0x30,
      0x30,
      0x30,
      0x39,
    ]),
    7: Buffer.from([
      0x6c,
      0x65,
      0x61,
      0x67,
      0x65,
      0x6e,
      0x64,
      0xff,
      0xfe,
      0x30,
      0x31,
      0x30,
      0x30,
      0x30,
      0x30,
      0x40,
    ])
  };


  static BatteryState = {
    0: "Normal",
    1: "Low voltage",
    2: "Charging"
  }
  static COMMAND_HEX = "d1550700000000000000000000000000";

  static async identify(device) {
    const name = await this.getDeviceProp(device, "Name");

    if (name && /BM[2|6|7]$/.test(name)) return this;
    else return null;
  }
  static ImageFile = "bm6.webp";

  createCipher(encrypt=true) {
    const iv = Buffer.alloc(16, 0);
    const cipher = encrypt?crypto.createCipheriv("aes-128-cbc", this._getCryptKey(), iv):crypto.createDecipheriv("aes-128-cbc", this._getCryptKey(), iv)  ;
    cipher.setAutoPadding(false);
    return cipher;
  }

  encryptCommand() {
    const cipher = this.createCipher();
    const plaintext = Buffer.from(this.constructor.COMMAND_HEX, "hex");
    return Buffer.concat([cipher.update(plaintext), cipher.final()]);
  }

  decryptPayload(payload) {
    const cipher = this.createCipher(false);
    const decrypted = Buffer.concat([cipher.update(payload), cipher.final()]);
    return decrypted;
  }

  hasGATT() {
    return true;
  }
  usingGATT() {
    return true;
  }

  emitGATT() {
    //TBD: May not work needs testing
    this.read
      .readValue()
      .then((buffer) =>
        this.emitValuesFrom(
          this.decryptPayload(buffer)
        )
      );
  }

  _getCryptKey() {
    return this.constructor.cryptKeys[this.monitorVersion];
  }
  initSchema() {
    super.initSchema();
    this.getGATTParams()["useGATT"].default = true;
    this.addParameter("monitorVersion", {
      title: "monitor version", //unclear if version 2 has same GATT characteristics and data format
      enum: [2, 6, 7],
      isRequired: true,
      type: "number",
      default: 6,
    });

    this.addDefaultParam("batteryID");

    this.addDefaultPath("voltage", "electrical.batteries.voltage").read = (
      buffer
    ) => {
      return buffer.readUInt16BE(7) / 100;
    };

    this.addDefaultPath(
      "soc",
      "electrical.batteries.capacity.stateOfCharge"
    ).read = (buffer) => {
      return buffer.readUInt8(6) / 100;
    };

     this.addMetadatum("batteryState", "", "battery state", (buff) => {
       return this.constructor.BatteryState[buff.readIntU8(5)];
     }).default = "electrical.batteries.{id}.state";


    this.addDefaultPath(
      "temperature",
      "electrical.batteries.temperature"
    ).read = (buffer) => {
      return ((buffer.readUInt8(3)?-1:1)*buffer.readUInt8(4)) + 273.15
    };
  }

  async initGATTConnection(isReconnecting) {
    await super.initGATTConnection(isReconnecting);
    const gattServer = await this.getGATTServer();
    const service = await gattServer.getPrimaryService(
      this.constructor.GATT_SERVICE_UUID
    );
    this.write = await service.getCharacteristic(
      this.constructor.GATT_WRITE_UUID
    );
    this.read = await service.getCharacteristic(
      this.constructor.GATT_READ_UUID
    );
  }

  async initGATTNotifications() {
    await this.read.startNotifications();
    await this.write.writeValueWithResponse(
      this.encryptCommand(this._getCryptKey())
    );

    this.read.on("valuechanged", (buffer) => {
      if (buffer.length < 16) {
        this.debug(`Received invalid buffer ${JSON.stringify(buffer)}`);
        return;
      }
      const b = this.decryptPayload(buffer);
      if (Buffer.compare(b.subarray(0, 3), Buffer.from([0xd1, 0x55, 0x07]))==0)
        this.emitValuesFrom(b);
    });
  }

  async deactivateGATT() {
    await this.stopGATTNotifications(this.read);
    await super.deactivateGATT();
  }
}
module.exports = BMBatteryMonitor;
