const BTSensor = require("../BTSensor");
class SensorPush extends BTSensor {
  static Domain = BTSensor.SensorDomains.environmental;

  static async identify(device) {
    const name = await this.getDeviceProp(device, "Name");
    const regex = /^SensorPush\s(HT|HTP)\s[0-9a-fA-F]{4}$/;
    if (name && name.match(regex)) return this;
    else return null;
  }
  static ImageFile = "SensorPush.webp";
  static Manufacturer =
    "Cousins & Sears - Creative Technologists - Brooklyn, NY USA";
  static ServiceUUID = "ef090000-11d6-42ba-93b8-9dd7ec090ab0";
  static Characteristics = {
    tx: "ef090003-11d6-42ba-93b8-9dd7ec090aa9",
    adv: "ef090005-11d6-42ba-93b8-9dd7ec090aa9",
    batt: "ef090007-11d6-42ba-93b8-9dd7ec090aa9",
    LED: "ef09000c-11d6-42ba-93b8-9dd7ec090aa9",
    temp: "ef090080-11d6-42ba-93b8-9dd7ec090aa9",
    hum: "ef090081-11d6-42ba-93b8-9dd7ec090aa9",
    bar: "ef090082-11d6-42ba-93b8-9dd7ec090aa9"
};
  pollFreq = 30;
  hasGATT() {
    return true;
  }
  usingGATT() {
    return true;
  }

  async emitGATT() {
    this.characteristics.temp.writeValue(0x01000000).then(async () => {
      this.emitData("temp", await this.characteristics.temp.readValue());
      this.emitData("hum", await this.characteristics.temp.readValue());
    });
    this.characteristics.bar.writeValue(0x01000000).then(async () => {
      this.emitData("bar", await this.characteristics.bar.readValue());
    });
  }

  initSchema() {
    super.initSchema();
    this.getGATTParams()["useGATT"].default = true;

    this.addDefaultParam("zone");

    this.addParameter("tx", {
      title: "transmission power in db",
      type: "number",
      enum: [-21, -18, -15, -12, -9, -6, -3, 0, 1, 2, 3, 4, 5],
      default: -3,
      isRequired: true,
    });
    this.addParameter("adv", {
      title: "advertising interval in ms",
      type: "number",
      default: 1285,
      minimum: Math.round((32 * 625) / 1000),
      maximum: Math.round((32767 * 625) / 1000),
      isRequired: true,
    });

    this.addParameter("LED", {
      type: "number",
      title: "LED flashes per second (0=off, 1-127, 128=once every second",
      default: 0,
      minimum: 0,
      maximum: 128,
      isRequired: true,
    });

    this.addDefaultPath("batt", "sensors.batteryVoltage").read = (buffer) => {
      return buffer.readUInt16LE() / 100;
    };

    this.addDefaultPath("temp", "environment.temperature").read = (buffer) => {
      return buffer.readInt32E() / 100;
    };

    this.addDefaultPath("humidity", "environment.humidity").read = (buffer) => {
      return buffer.readInt32E() / 10000;
    };

    this.addDefaultPath("pressure", "environment.pressure").read = (buffer) => {
      return buffer.readInt32E() / 100;
    };
  }

  async initGATTConnection(isReconnecting) {
    await super.initGATTConnection(isReconnecting);
    const gattServer = await this.getGATTServer();
    const service = await gattServer.getPrimaryService(
      this.constructor.ServiceUUID,
    );
    this.characteristics = {};
    for (const c in this.constructor.Characteristics) {
      this.characteristics[c] = await service.getCharacteristic(
        this.constructor.Characteristics[c],
      );
    }
    if (this.tx) this.characteristics.tx.writeValueWithoutResponse(this.tx);
    if (this.LED) this.characteristics.LED.writeValueWithoutResponse(this.LED);
    if (this.adv)
      this.characteristics.tx.writeValueWithoutResponse(
        Math.round((this.adv / 625) * 1000),
      );
  }
  async initGATTNotifications() {}

  async deactivateGATT() {
    for (const c in this.characteristics) {
      await this.stopGATTNotifications(this.characteristics[c]);
    }
    await super.deactivateGATT();
  }
}
module.exports=SensorPush