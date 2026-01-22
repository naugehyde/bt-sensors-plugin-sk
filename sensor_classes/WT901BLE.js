const WT901Sensor = require("./WitMotion/WT901Sensor");
const assert = require('node:assert').strict;
const test = require('node:test');
//const assert = require('node:assert');
class WT901BLE extends   WT901Sensor {

    static getIDRegex(){
        return /^WT901BLE[a-f,A-F,0-9]{2}/
    }
    set(key, value) {
        this.data[key] = value;
    }

    static TX_RX_SERVICE = "0000ffe5-0000-1000-8000-00805f9a34fb";
    static NOTIFY_CHAR_UUID = "0000ffe4-0000-1000-8000-00805f9a34fb";
    static WRITE_CHAR_UUID = "0000ffe9-0000-1000-8000-00805f9a34fb";

    // comands and data format
    // from https://wit-motion.gitbook.io/witmotion-sdk/ble-5.0-protocol/bluetooth-5.0-communication-protocol
    static readMagneticField = 0x3a
    static readQuaturions = 0x51
    static readTemperature = 0x40  // TODO: implement temp
    static readPower = 0x64        // TODO: read internal battery level of the device


    static shallowEqual(object1, object2) {
        const keys1 = Object.keys(object1);
        const keys2 = Object.keys(object2);

        if (keys1.length !== keys2.length) {
          assert(false)
          return false;
        }

        for (let key of keys1) {
          if (object1[key] !== object2[key]) {
            assert(false)
            return false;
          }
        }

        return true;
    }
    static test() {
        const sensor = new WT901BLE()
        sensor.getName=()=>{return "WT901BLE fake"}
        sensor.initSchema()
        sensor.on("pitch", (t)=>{console.log(`pitch => ${t}`)})
        sensor.on("roll", (t)=>{console.log(`roll => ${t}`)})
        sensor.on("yaw", (t)=>{console.log(`yaw => ${t}`)})
        console.log("starting tests")
        var match = {AccX: -0.015, AccY: -0.054, AccZ: 1.0, AsX: 0.0, AsY: 0.0, AsZ: 0.0, AngX: -2.939, AngY: 1.099, AngZ: 82.639 };
        sensor.emitValuesFrom(Buffer.from([0x55, 0x61, 0xe1, 0xff, 0x91, 0xff, 0x00, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xe9, 0xfd, 0xc8, 0x00, 0xc4, 0x3a, ]))
        console.log(sensor.data)
        this.shallowEqual(sensor.data, match)
        match = {'AccX': -0.025, 'AccY': -0.054, 'AccZ': 1.0, 'AsX': 0.0, 'AsY': 0.0, 'AsZ': 0.0, 'AngX': -2.939, 'AngY': 1.099, 'AngZ': 82.639}
        sensor.emitValuesFrom(Buffer.from([0x55, 0x71, 0x3a, 0x00, 0xab, 0x0b, 0x48, 0x02, 0x68, 0x0d, 0xe9, 0xfd, 0xc8, 0x00, 0xc4, 0x3a, 0x94, 0x07, 0x00, 0x00, ]))
        sensor.emitValuesFrom(Buffer.from([0x55, 0x61, 0xe1, 0xff, 0x91, 0xff, 0x00, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xe7, 0xfd, 0xc6, 0x00, 0xc4, 0x3a, ]))
        match = {'AccX': -0.015, 'AccY': -0.054, 'AccZ': 1.0, 'AsX': 0.0, 'AsY': 0.0, 'AsZ': 0.0, 'AngX': -2.95, 'AngY': 1.088, 'AngZ': 82.639, 'HX': 24.892, 'HY': 4.867, 'HZ': 28.6}
        this.shallowEqual(sensor.data, match)
        sensor.emitValuesFrom(Buffer.from([0x55, 0x71, 0x51, 0x00, 0xef, 0x9f, 0x47, 0x03, 0x46, 0x01, 0x7f, 0xab, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, ]))
        sensor.emitValuesFrom(Buffer.from([0x55, 0x61, 0xdf, 0xff, 0x91, 0xff, 0xff, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xe6, 0xfd, 0xc4, 0x00, 0xc4, 0x3a, ]))
        match = {'AccX': -0.016, 'AccY': -0.054, 'AccZ': 1.0, 'AsX': 0.0, 'AsY': 0.0, 'AsZ': 0.0, 'AngX': -2.955, 'AngY': 1.077, 'AngZ': 82.639, 'HX': 24.892, 'HY': 4.867, 'HZ': 28.6, 'Q0': -0.75052, 'Q1': 0.0256, 'Q2': 0.00995, 'Q3': -0.66019}
        this.shallowEqual(sensor.data, match)
        console.log("Tests passed")
    }
    static ImageFile = "wt901ble.webp"

    emitValuesFrom(buffer){
        this.processData(buffer)
    }

    async initSchema(){
        super.initSchema()
        this.addDefaultParam("zone")
        this.data = {};

        this.addDefaultPath("pitch","navigation.attitude.pitch")
        this.addDefaultPath("yaw","navigation.attitude.yaw")
        this.addDefaultPath("roll","navigation.attitude.roll")
        //await this.initGATTConnection(true);
        //await this.initGATTNotifications()

    }


      // Used for getting other data
      async getBuffer(command) {
        let result = Buffer.alloc(256);
        let offset = 0;
        let lastPacketTime = Date.now();

        // Set up listener first
        const responsePromise = new Promise((resolve, reject) => {
          const timer = setTimeout(() => {
            clearTimeout(timer);
            if (completionTimer) clearTimeout(completionTimer);
            this.rxChar.removeAllListeners("valuechanged");
            reject(
              new Error(
                `Response timed out (+10s) from HSC14F device ${this.getName()}.`
              )
            );
          }, 10000);

          let completionTimer = null;

          const valChanged = (buffer) => {
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
            lastPacketTime = Date.now();

            // Clear any existing completion timer
            if (completionTimer) clearTimeout(completionTimer);

            // Wait 200ms after last packet to consider response complete
            // This allows multi-packet responses to assemble properly
            completionTimer = setTimeout(() => {
              result = Uint8Array.prototype.slice.call(result, 0, offset);
              this.rxChar.removeAllListeners("valuechanged");
              clearTimeout(timer);
              resolve(result);
            }, 200);
          };

          // Set up listener BEFORE sending command
          this.rxChar.on("valuechanged", valChanged);
        });

        // Small delay to ensure listener is attached
        await new Promise(r => setTimeout(r, 100));

        // Send the command
        try {
          await this.sendCommand(command);
        } catch (err) {
          this.rxChar.removeAllListeners("valuechanged");
          throw err;
        }

        // Wait for response
        return responsePromise;
      }


      /**  GATT Model ---------------------------------------------------
        1. initSchema() that connects to the device and sets up characteristics
        2. initGATTConnection() override if needed
        3. initGATTNotifications() or initGATTInterval() depending on polling vs notifications
        4. emitGATT() method that requests data and parses responses
        5. Helper methods like sendReadFunctionRequest() if needed
      */
      hasGATT(){
        return true
      }
      usingGATT(){
        return true
      }

      // register device for notifications
      async initGATTNotifications(){
        this.debug('in initGATTNotifications')
        // now process notifications from device
        await this.rxChar.startNotifications();
        this.rxChar.on("valuechanged", (buffer)=>{
            this.debug('rx notify: ${buffer}')
            this.processData(buffer)
            })

            // polling... not used for now
        //this.intervalID = setInterval( async ()=>{
        //    await this.emitGATT()
        //}, 1000*(this?.pollFreq??60) )


      }

      /**
       * Setup connection
      */
      async initGATTConnection(isReconnecting = false) {
        this.debug('in initGATTConnection')
        // base class connects to device
        await super.initGATTConnection(isReconnecting);

        // Set up GATT characteristics
        const gattServer = await this.device.gatt();
        const txRxService = await gattServer.getPrimaryService(
          this.constructor.TX_RX_SERVICE
        );
        this.rxChar = await txRxService.getCharacteristic(
          this.constructor.NOTIFY_CHAR_UUID
        );
        //TODO: setup write
        //this.txChar = await txRxService.getCharacteristic(
        //  this.constructor.WRITE_CHAR_UUID
        //);


        return this;
      }

      async emitGATT(){
        this.debug('in emitGATT, pollfreq: ${pollfreq}')
        //await this.emitGATT2()
      }
      async emitGATT2(){

        // Get quaturinous
        try {
          await this.getAndEmit(this.readQuaturions)
        }
        catch (e) {
          this.debug(`Failed to emit battery info for ${this.getName()}: ${e}`)
        }
        // delay for a bit, then send the mag field
        setTimeout(async ()=>{
          try {await this.getAndEmit(this.readMagneticField)}
          catch (e) {
            this.debug(`Failed to emit Cell Voltages for ${this.getName()}: ${e}`)
          }
        }, 1000)
    }

    async getAndEmit(cmd){
        return this.getBuffer(cmd).then((buffer)=>{
            this.processData(buffer)
      })
    }


}
module.exports=WT901BLE
