const { ThemeProvider } = require("react-bootstrap");
const BTSensor = require("../BTSensor");
let FakeDevice,FakeGATTService,FakeGATTCharacteristic;

// Dynamically import FakeBTDevice.js for node<= 20 
import('../development/FakeBTDevice.js')    
  .then(module => {
        FakeDevice = module.FakeDevice; 
        FakeGATTService= module.FakeGATTService
        FakeGATTCharacteristic=module.FakeGATTCharacteristic

    })
    .catch(error => {
        console.error('Error loading FakeBTDevice:', error);
    });

function sumByteArray(byteArray) {
 let sum = 0;
    for (let i = 0; i < byteArray.length; i++) {
     sum += byteArray[i];
   }
   return sum;
 }

const countSetBits=(n)=> {return (n == 0)?0:(n & 1) + countSetBits(n >> 1)};
class JikongBMS extends BTSensor {
  static Domain = BTSensor.SensorDomains.electrical;

  static RX_SERVICE = "0000ffe0-0000-1000-8000-00805f9b34fb";
  static RX_CHAR_UUID = "0000ffe1-0000-1000-8000-00805f9b34fb";
  static validResponseHeader = 0x55aaeb90;
  static validAcknowledgeHeader = 0xaa5590eb;

  static commandResponse = {
    0x96: 0x02,
    0x97: 0x03,
  };

  static async test(datafile) {
    const data = require(datafile);
    const device = new FakeDevice([
      new FakeGATTService(this.RX_SERVICE, [
        new FakeGATTCharacteristic(
          this.RX_CHAR_UUID,
          data.data["0x96"],
          data.delay
        ),
      ]),
    ]);
    const obj = new JikongBMS(device, { offset: 16, dischargeFloor: 0.1 });
    obj.currentProperties = { Name: "Fake JKBMS", Address: "<mac>" };
    obj.debug = (m) => {
      console.log(m);
    };
    obj.deviceConnect = () => {};

    await obj.initSchema();
    await obj.initGATTInterval();
    for (const [tag, path] of Object.entries(
      obj._schema.properties.paths.properties
    )) {
      obj.on(tag, (val) => {
        console.log(`${tag} => ${val} `);
      });
    }
  }
  static identify(device) {
    return null;
  }
  static ImageFile = "JikongBMS.jpg";
  connections = 0;

  jikongCommand(command) {
    var result = [
      0xaa,
      0x55,
      0x90,
      0xeb,
      command,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
    ];
    result.push(Buffer.from([sumByteArray(result)])[0]);
    return result;
  }

  async sendReadFunctionRequest(command) {
    this.debug(`sending ${command} for ${this.getName()}`);
    try {
      return await this.rxChar.writeValueWithoutResponse(
        Buffer.from(this.jikongCommand(command))
      );
    } catch (e) {
      this.debug(
        `Error rec'd writing data: ${e.message} for ${this.getName()}`
      );
    }
  }

  
  async initSchema() {
    super.initSchema();
    this.addDefaultParam("batteryID");
    this.addParameter("offset", {
      description: "Data offset",
      type: "number",
      isRequired: true,
      default: 16,
    });

    this.addParameter("dischargeFloor", {
      description: "Discharge floor ratio ",
      isRequired: true,
      type: "number",
      default: 0.1,
      minimum: 0,
      max: 0.99,
    });

    if (this.numberOfCells == undefined) {
      try {
        this.debug("Getting number of cells...")
        await this.initGATTConnection();
        this.numberOfCells = await this.getNumberOfCells()
      }
      catch(e){
        this.numberOfCells = 4;
      }
    }

    this.addParameter("numberOfCells", {
      description: "Number of cells",
      type: "number",
      isRequired: true,
      default: this.numberOfCells,
    });

    for (let i = 0; i < this?.numberOfCells ?? 4; i++) {
      this.addMetadatum(
        `cell${i}Voltage`,
        "V",
        `Cell ${i + 1} voltage`,
        (buffer) => {
          if (i == 0) {
            this.currentProperties._totalCellVoltage = 0;
            this.currentProperties._maxCellVoltage = 0;
            this.currentProperties._minCellVoltage = 0;
          }
          const v = buffer.readUInt16LE(6 + i * 2) / 1000;
          this.currentProperties._totalCellVoltage += v;
          if (v > this.currentProperties._maxCellVoltage)
            this.currentProperties._maxCellVoltage = v;
          if (
            this.currentProperties._minCellVoltage == 0 ||
            v < this.currentProperties._minCellVoltage
          )
            this.currentProperties._minCellVoltage = v;
          return v;
        }
      ).default = `electrical.batteries.{batteryID}.cell${i}.voltage`;

      this.addMetadatum(
        `cell${i}Resistance`,
        "ohm",
        `Cell ${i + 1} resistance in ohms`,
        (buffer) => {
          return buffer.readUInt16LE(i * 2 + 64 + this.offset) / 1000;
        }
      ).default = `electrical.batteries.{batteryID}.cell${i}.resistance`;
    }

    this.addMetadatum(
      "avgCellVoltage",
      "number",
      "Average Cell Voltage",
      () => {
        return this.currentProperties._totalCellVoltage / this.numberOfCells;
      }
    ).default = "electrical.batteries.{batteryID}.avgCellVoltage";

    this.addMetadatum(
      "deltaCellVoltage",
      "number",
      "Delta Cell Voltage",
      () => {
        return (
          this.currentProperties._maxCellVoltage -
          this.currentProperties._minCellVoltage
        );
      }
    ).default = "electrical.batteries.{batteryID}.deltaCellVoltage";

    this.addDefaultPath("voltage", "electrical.batteries.voltage").read = (
      buffer
    ) => {
      return buffer.readUInt16LE(118 + this.offset * 2) / 1000;
    };

    this.addDefaultPath("power", "electrical.batteries.power", (buffer) => {
      return buffer.readInt16LE(122 + this.offset * 2) / 1000;
    });

    this.addDefaultPath("current", "electrical.batteries.current").read = (
      buffer
    ) => {
      this.currentProperties._current =
        buffer.readInt16LE(126 + this.offset * 2) / 1000;
      return this.currentProperties._current;
    };

    this.addDefaultPath(
      "remainingCapacity",
      "electrical.batteries.capacity.remaining"
    ).read = (buffer) => {
      this.currentProperties._capacityRemaining =
        (buffer.readUInt32LE(142 + this.offset * 2) / 1000) * 3600;
      return this.currentProperties._capacityRemaining;
    };

    this.addDefaultPath(
      "capacity",
      "electrical.batteries.capacity.actual"
    ).read = (buffer) => {
      this.currentProperties._capacityActual =
        (buffer.readUInt32LE(146 + this.offset * 2) / 1000) * 3600;
      return this.currentProperties._capacityActual;
    };

    this.addDefaultPath(
      "timeRemaining",
      "electrical.batteries.capacity.timeRemaining"
    ).read = (buffer) => {
      return Math.abs(
        (this.currentProperties._capacityActual * this.dischargeFloor) /
          this.currentProperties._current
      );
    };

    this.addDefaultPath("cycles", "electrical.batteries.cycles").read = (
      buffer
    ) => {
      return buffer.readUInt32LE(150 + this.offset * 2);
    };

    this.addMetadatum("cycleCapacity", "number", "Cycle capacity", (buffer) => {
      return buffer.readUInt32LE(154 + this.offset * 2) / 1000;
    }).default = "electrical.batteries.{batteryID}.discharging";

    this.addMetadatum(
      "balanceAction",
      "",
      "Balancing action (0=off 1=Charging Balance, 2=Discharging Balance",
      (buffer) => {
        return buffer[140 + this.offset * 2];
      }
    ).default = "electrical.batteries.{batteryID}.balanceAction";

    this.addMetadatum("balancingCurrent", "", "Balancing current", (buffer) => {
      return buffer.readUInt16LE(138 + this.offset * 2) / 1000;
    }).default = "electrical.batteries.{batteryID}.balance";

    this.addDefaultPath(
      "SOC",
      "electrical.batteries.capacity.stateOfCharge"
    ).read = (buffer) => {
      return buffer[141 + this.offset * 2] / 100;
    };

    this.addDefaultPath(
      "SOH",
      "electrical.batteries.capacity.stateOfHealth"
    ).read = (buffer) => {
      return buffer[158 + this.offset * 2] / 100;
    };

    this.addMetadatum("runtime", "s", "Total runtime in seconds", (buffer) => {
      return buffer.readUInt32LE(162 + this.offset * 2);
    }).default = "electrical.batteries.{batteryID}.runtime";

    this.addMetadatum(
      "timeEmergency",
      "s",
      "Time emergency in seconds",
      (buffer) => {
        return buffer.readUInt16LE(186 + this.offset * 2);
      }
    ).default = "electrical.batteries.{batteryID}.timeEmergency";

    this.addMetadatum(
      "charging",
      "bool",
      "MOSFET Charging enable",
      (buffer) => {
        return buffer[166 + this.offset * 2] == 1;
      }
    ).default = "electrical.batteries.{batteryID}.charging";

    this.addMetadatum(
      "discharging",
      "bool",
      "MOSFET Disharging enable",
      (buffer) => {
        return buffer[167 + this.offset * 2] == 1;
      }
    ).default = "electrical.batteries.{batteryID}.discharging";

    this.addMetadatum("temp1", "K", "Temperature in K", (buffer) => {
      return 273.15 + buffer.readInt16LE(130 + this.offset * 2) / 10;
    }).default = "electrical.batteries.{batteryID}.temperature";

    this.addMetadatum("temp2", "K", "Temperature 2 in K", (buffer) => {
      return 273.15 + buffer.readInt16LE(132 + this.offset * 2) / 10;
    }).default = "electrical.batteries.{batteryID}.temperature2";

    this.addMetadatum("mosTemp", "K", "MOS Temperature in K", (buffer) => {
      return 273.15 + buffer.readInt16LE(112 + this.offset * 2) / 10;
    }).default = "electrical.batteries.{batteryID}.mosTemperature";
  }

  hasGATT() {
    return true;
  }
  async initGATTNotifications() {
    this.debug(`${this.getName()}::initGATTNotifications`);
  }

  async emitGATT() {
    await this.getAndEmitBatteryInfo();
  }

  async getNumberOfCells() {
    this.debug(`${this.getName()}::getNumberOfCells`);

    const b = await this.getBuffer(0x96);
    return countSetBits(b.readUInt32BE(70));
  }

  getBuffer(command) {
    return new Promise(async (resolve, reject) => {
      const r = await this.sendReadFunctionRequest(command);
      let datasize = 300;
      let result = Buffer.alloc(datasize);
      let offset = 0;

      const timer = setTimeout(() => {
        this.rxChar.removeAllListeners();
        clearTimeout(timer);
        reject(
          new Error(
            `Response timed out (+30s) getting results for command ${command} from JikongBMS device ${this.getName()}.`
          )
        );
      }, 30000);

      const valChanged = async (buffer) => {
        if (
          offset == 0 && //first packet
          (buffer.length < 5 ||
            buffer.readUInt32BE(0) !== this.constructor.validResponseHeader)
        ) {
          if (
            buffer.readUInt32BE(0) !== this.constructor.validAcknowledgeHeader
          )
            this.debug(
              `Invalid buffer ${JSON.stringify(
                buffer
              )}from ${this.getName()}, not processing.`
            );
        } else {
          buffer.copy(result, offset);
          if (offset + buffer.length == datasize) {
            if (result[4] == this.constructor.commandResponse[command]) {
              this.rxChar.removeAllListeners();
              clearTimeout(timer);
              this.debug(
                `Rec'd command in buffer ${JSON.stringify(
                  result
                )} for ${this.getName()}`
              );
              resolve(result);
            } else {
              offset = 0;
              result = Buffer.alloc(datasize);
            }
          } else {
            offset += buffer.length;
          }
        }
      };
      this.rxChar.on("valuechanged", valChanged);
    });
  }

  usingGATT() {
    return false;
  }

  async getAndEmitBatteryInfo() {
    const buffer = await this.getBuffer(0x96);
    [
      "current",
      "voltage",
      "remainingCapacity",
      "capacity",
      "cycles",
      "charging",
      "discharging",
      "balanceAction",
      "timeRemaining",
      "balancingCurrent",
      "cycleCapacity",
      "timeEmergency",
      "SOC",
      "SOH",
      "runtime",
      "temp1",
      "temp2",
      "mosTemp",
    ].forEach((tag) => this.emitData(tag, buffer));
    for (let i = 0; i < this.numberOfCells; i++) {
      this.emitData(`cell${i}Voltage`, buffer);
      this.emitData(`cell${i}Resistance`, buffer);
    }

    ["deltaCellVoltage", "avgCellVoltage"].forEach((tag) => this.emitData(tag));
  }

  async deactivateGATT() {
    await this.stopGATTNotifications(this.rxChar) 

    await super.deactivateGATT();
  }

  async initGATTConnection(isReconnecting = false) {
    this.debug(`${this.getName()}::initGATTConnection`);

    if (this.rxChar)
      try {
        this.rxChar.removeAllListeners()
        await this.rxChar.stopNotifications()
      }
      catch(e){
        this.debug(`error while stopping notifications`)
        this.debug(e)
      }
    
    try {
      await super.initGATTConnection(isReconnecting);
      const gattServer = await this.getGATTServer();

      this.rxService = await gattServer.getPrimaryService(
        this.constructor.RX_SERVICE
      );
      this.rxChar = await this.rxService.getCharacteristic(
        this.constructor.RX_CHAR_UUID
      );
      await this.rxChar.startNotifications();

    } catch (e) {
      this.setError(e.message)
    }
    
    try {
      await this.getBuffer(0x97)
    } catch(e){
      this.debug(`Error encountered calling getBuffer(0x97)`)
    }
    //this.debug(`(${this.getName()}) Connections: ${this.connections++}`)
  }

  async initGATTInterval(){
    this.intervalID = setInterval(async () => {
        this.setError(false)
        if (!(await this.device.isConnected())) {
          await this.initGATTConnection(true);
        }
        await this.getAndEmitBatteryInfo();
      }, this?.pollFreq??40 * 1000);

    try {
      await this.getAndEmitBatteryInfo();
    } catch(e) {
      this.setError(e.message)
    } 
    }
}

module.exports = JikongBMS;