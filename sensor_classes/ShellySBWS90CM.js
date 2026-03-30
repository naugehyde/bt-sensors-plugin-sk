const AbstractBTHomeSensor = require("./BTHome/AbstractBTHomeSensor");

/**
 * Sensor class representing the Shelly / Ecowitt WS90 weather station.
 * The device publishes BTHome v2 service data on UUID 0xFCD2.
 */
class ShellySBWS90CM extends AbstractBTHomeSensor {
  static Domain = this.SensorDomains.environmental;
  static SHORTENED_LOCAL_NAME = "SBWS-90CM";
  static LOCAL_NAME = "SBWS-90CM";
  static ImageFile = "shelly-ws90.jpeg";

  getTextDescription() {
    return `Shelly/Ecowitt WS90 weather station (BTHome v2 over BLE service UUID 0xFCD2).`;
  }

  getId() {
    // Stable, persistent ID so SignalK can store configuration
    return `ShellySBWS90CM:${this.getAddress()}`;
  }

  initSchema() {
    super.initSchema();
    this.addDefaultParam("zone", true).default = "outside";

    this.addMetadatum("temperatureK", "K", "outside temperature", this.parseTemperatureK.bind(this)).default =
      "environment.{zone}.temperature";

    this.addMetadatum("humidityRatio", "ratio", "relative humidity", this.parseHumidityRatio.bind(this)).default =
      "environment.{zone}.humidity";

    this.addMetadatum("pressurePa", "Pa", "ambient pressure", this.parsePressurePa.bind(this)).default =
      "environment.outside.pressure";

    this.addMetadatum("illuminanceLux", "lux", "illuminance", this.parseIlluminanceLux.bind(this)).default =
      "environment.{zone}.illuminance";

    this.addMetadatum("uvIndex", "", "UV index", this.parseUVIndex.bind(this)).default = "environment.{zone}.uvIndex";

    this.addMetadatum("isRaining", "boolean", "rain status", this.parseIsRaining.bind(this)).default =
      "environment.{zone}.raining";

    this.addMetadatum("precipitationMm", "mm", "precipitation", this.parsePrecipitationMm.bind(this)).default =
      "environment.{zone}.precipitation";

    this.addMetadatum("windSpeed", "m/s", "true wind speed", this.parseWindSpeed.bind(this)).default = "environment.wind.speedTrue";

    this.addMetadatum("windGust", "m/s", "true wind gust", this.parseWindGust.bind(this)).default = "environment.wind.gust";

    this.addMetadatum("windDirectionRad", "rad", "true wind direction", this.parseWindDirectionRad.bind(this)).default =
      "environment.wind.directionTrue";

    this.addMetadatum("batteryRatio", "ratio", "battery ratio", this.parseBatteryRatio.bind(this)).default =
      "sensors.{macAndName}.battery";
  }

  parseBatteryRatio(decoded) {
    if (typeof decoded.batteryRatio === "number") return decoded.batteryRatio;
    return null;
  }

  parseTemperatureK(decoded) {
    if (typeof decoded.temperatureK === "number") return decoded.temperatureK;
    return null;
  }

  parseHumidityRatio(decoded) {
    if (typeof decoded.humidityRatio === "number") return decoded.humidityRatio;
    return null;
  }

  parsePressurePa(decoded) {
    if (typeof decoded.pressurePa === "number") return decoded.pressurePa;
    return null;
  }

  parseIlluminanceLux(decoded) {
    if (typeof decoded.illuminanceLux === "number") return decoded.illuminanceLux;
    return null;
  }

  parseUVIndex(decoded) {
    if (typeof decoded.uvIndex === "number") return decoded.uvIndex;
    return null;
  }

  parseIsRaining(decoded) {
    if (typeof decoded.isRaining === "boolean") return decoded.isRaining;
    return null;
  }

  parsePrecipitationMm(decoded) {
    if (typeof decoded.precipitationMm === "number") return decoded.precipitationMm;
    return null;
  }

  parseWindDirectionRad(decoded) {
    if (typeof decoded.windDirectionRad === "number") return decoded.windDirectionRad;
    return null;
  }

  parseWindSpeed(decoded) {
    if (typeof decoded.windSpeed === "number") return decoded.windSpeed;
    return null;
  }

  parseWindGust(decoded) {
    if (typeof decoded.windGust === "number") return decoded.windGust;
    return null;
  }

  readU16LE(buffer, index) {
    return buffer.readUInt16LE(index);
  }

  readI16LE(buffer, index) {
    return buffer.readInt16LE(index);
  }

  readU24LE(buffer, index) {
    return buffer[index] | (buffer[index + 1] << 8) | (buffer[index + 2] << 16);
  }

  decodeWS90BTHomeData(buffer) {
    if (!buffer || buffer.length < 1) return null;

    const decoded = {};
    const deviceInfo = buffer.readUInt8(0);
    // BTHome v2 encryption flag: bit0 = 1 means encrypted payload
    if ((deviceInfo & 0x01) !== 0) {
      this.debug(`${this.getDisplayName()} BTHome payload is encrypted; skipping decode`);
      return null;
    }
    let index = 1;

    let windSpeedCount = 0;

    while (index < buffer.length) {
      const objectId = buffer[index++];
      switch (objectId) {
        case 0x00: // packet id uint8 (ignore)
          if (index + 1 > buffer.length) return decoded;
          index += 1;
          break;
        case 0x01: // battery % uint8 -> ratio
          if (index + 1 > buffer.length) return decoded;
          decoded.batteryRatio = Number.parseFloat((buffer.readUInt8(index) / 100).toFixed(2));
          index += 1;
          break;
        case 0x45: // temperature C*0.1 int16 -> Kelvin
          if (index + 2 > buffer.length) return decoded;
          decoded.temperatureK = Number.parseFloat((273.15 + this.readI16LE(buffer, index) * 0.1).toFixed(2));
          index += 2;
          break;
        case 0x2e: // humidity % uint8 -> ratio
          if (index + 1 > buffer.length) return decoded;
          decoded.humidityRatio = Number.parseFloat((buffer.readUInt8(index) / 100).toFixed(2));
          index += 1;
          break;
        case 0x04: // pressure hPa*0.01 uint24 -> Pa
          if (index + 3 > buffer.length) return decoded;
          decoded.pressurePa = Number.parseFloat((this.readU24LE(buffer, index) * 0.01 * 100).toFixed(2));
          index += 3;
          break;
        case 0x05: // illuminance lux*0.01 uint24 -> lux
          if (index + 3 > buffer.length) return decoded;
          decoded.illuminanceLux = Number.parseFloat((this.readU24LE(buffer, index) * 0.01).toFixed(2));
          index += 3;
          break;
        case 0x46: // UV index *0.1 uint8
          if (index + 1 > buffer.length) return decoded;
          decoded.uvIndex = Number.parseFloat((buffer.readUInt8(index) * 0.1).toFixed(1));
          index += 1;
          break;
        case 0x20: // rain status bool uint8
          if (index + 1 > buffer.length) return decoded;
          decoded.isRaining = buffer.readUInt8(index) !== 0;
          index += 1;
          break;
        case 0x5f: // precipitation mm*0.1 uint16
          if (index + 2 > buffer.length) return decoded;
          decoded.precipitationMm = Number.parseFloat((this.readU16LE(buffer, index) * 0.1).toFixed(1));
          index += 2;
          break;
        case 0x5e: // wind direction deg*0.01 uint16 -> radians
          if (index + 2 > buffer.length) return decoded;
          decoded.windDirectionRad = Number.parseFloat(((this.readU16LE(buffer, index) * 0.01 * Math.PI) / 180).toFixed(4));
          index += 2;
          break;
        case 0x44: { // wind/gust speed m/s*0.01 uint16; appears twice
          if (index + 2 > buffer.length) return decoded;
          const value = Number.parseFloat((this.readU16LE(buffer, index) * 0.01).toFixed(2));
          if (windSpeedCount === 0) decoded.windSpeed = value;
          else if (windSpeedCount === 1) decoded.windGust = value;
          windSpeedCount += 1;
          index += 2;
          break;
        }
        case 0x08: // optional dew point C*0.01 int16 (ignored)
          if (index + 2 > buffer.length) return decoded;
          index += 2;
          break;
        case 0x0c: // optional capacitor voltage V*0.001 uint16 (ignored)
          if (index + 2 > buffer.length) return decoded;
          index += 2;
          break;
        default:
          this.debug(`${this.getDisplayName()} unsupported BTHome object 0x${objectId.toString(16)}`);
          return decoded;
      }
    }

    return decoded;
  }

  propertiesChanged(props) {
    const raw = this.getServiceData(this.constructor.BTHOME_SERVICE_ID);
    if (!raw) return;
    const buffer = Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
    if (!this._ws90LoggedOnce) {
      this._ws90LoggedOnce = true;
      this.debug(`WS90 raw serviceData len=${buffer.length} hex=${buffer.toString("hex")}`);
    }
    const decoded = this.decodeWS90BTHomeData(buffer);
    if (!decoded) return;

    this.emitValuesFrom(decoded);
  }
}

module.exports = ShellySBWS90CM;
