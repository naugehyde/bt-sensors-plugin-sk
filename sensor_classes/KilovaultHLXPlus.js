/*
    Sensor class for monitoring Kilovault HLX+ batteries.

    Status from the battery is collected via the BLE notify method.  A complete status
    message consists of several fragments, which must be pieced back together.  The
    format of the status message is described below.  All data fields are hexidecimal
    character strings in little-endian order (e.g. "0F34" is four characters, not just two
    bytes, and represents 0x340F (13327 decimal)).

	Index   Length  Description
	  0     1       indicator (0xb0) for start of message
	  1     4       Voltage, in millivolts
	  5     4       ???
	  9     8       Current (milliamps), two's complement for negative values
	 17     8       Energy Capacity (milliwatt-hours)
	 25     4       Number of charge cycles
	 29     4       State of Charge (SOC) (%)
	 33     4       Temperature * 10 (deci-°K)
	 37     4       status ???
	 41     4       AFE status ???
	 45     4       Cell 1 Voltage (millivolts)
	 49     4       Cell 2 Voltage (millivolts)
	 53     4       Cell 3 Voltage (millivolts)
	 57     4       Cell 4 Voltage (millivolts)
	 61     16      all zeroes
	 77     16      all zeroes
	 93     16      all zeroes
	109     4       16-bit CRC of bytes 1 - 108, represented in big-endian order
	113     8       eight 'R's; i.e. 'RRRRRRRR'

	The format was derived from:  
	  https://github.com/fancygaphtrn/esphome/tree/master/my_components/kilovault_bms_ble

 */

const BTSensor = require("../BTSensor");
class KilovaultHLXPlus extends BTSensor{
    static Domain = BTSensor.SensorDomains.electrical
    
    constructor(device, config, gattConfig) {
        super(device, config, gattConfig)
        this.accumulated_buffer = Buffer.alloc(0)
    }

    static async identify(device){
        const regex = /^\d\d\-(12|24|36)00HLX\+\d{4}/
	// This regex will match factory-assigned names (e.g. "21-2400HLX+0013").
	// If you have renamed the battery, you will need to manually select the sensor
	// type during configuration.

        const name = await this.getDeviceProp(device,'Name')
        if (name && name.match(regex))
            return this 
        else
            return null
    }

    hasGATT(){
        return true
    }
    emitGATT(){
        // Nothing to do here.  HLX+ only reports via BLE notify, not BLE read
    }

    async initSchema(){
        super.initSchema()
        this.addDefaultParam("batteryID")

        this.addDefaultPath("voltage","electrical.batteries.voltage")
            .read=(buffer)=>{return Number(buffer.readInt16LE(0)) / 1000}
       
        this.addDefaultPath("current","electrical.batteries.current")
            .read=(buffer)=>{return buffer.readInt32LE(4) / 1000}
        
        this.addDefaultPath("energy", "electrical.batteries.capacity.remaining")
            .read=(buffer)=>{return buffer.readInt32LE(8) / 1000}
        
        this.addDefaultPath("cycles",'electrical.batteries.cycles')
            .read=(buffer)=>{return buffer.readInt16LE(12)}

        this.addDefaultPath("soc",'electrical.batteries.capacity,stateOfCharge')
            .read=(buffer)=>{return buffer.readInt16LE(14)}
        
        this.addDefaultPath("temperature",'electrical.batteries.temperature')
            .read=(buffer)=>{return buffer.readInt16LE(16)/10 }

        this.addMetadatum("status","","Battery Status",
            (buffer)=>{return buffer.readInt16LE(18) })
            .default="electrical.batteries.{batteryID}.status"

        this.addMetadatum("AFEStatus","","Battery AFE Status",
            (buffer)=>{return buffer.readInt16LE(20) })
            .default="electrical.batteries.{batteryID}.AFEStatus"

        this.addMetadatum("cell1_voltage","V","Cell 1 Voltage",
            (buffer)=>{return buffer.readInt16LE(22) / 1000})
            .default="electrical.batteries.{batteryID}.cell1.voltage"

        this.addMetadatum("cell2_voltage","V","Cell 2 Voltage",
            (buffer)=>{return buffer.readInt16LE(24) / 1000})
            .default="electrical.batteries.{batteryID}.cell2.voltage"

        this.addMetadatum("cell3_voltage","V","Cell 3 Voltage",
            (buffer)=>{return buffer.readInt16LE(26) / 1000})
            .default="electrical.batteries.{batteryID}.cell3.voltage"

        this.addMetadatum("cell4_voltage","V","Cell 4 Voltage",
            (buffer)=>{return buffer.readInt16LE(28) / 1000})
            .default="electrical.batteries.{batteryID}.cell4.voltage"

    }

    // Concatentate chunks received by notification into a complete message.
    // A message begins with 0xb0, is 121 bytes long, and ends with eight 'R's.
    // Preceding the string of eight 'R's, is a 16-bit CRC, calculated using
    // bytes 1 - 108.
    //
    reassemble(chunk) {
      try {
        if (this.accumulated_buffer.length > 121) {
          // If no complete message by now, we must have accumulated some garbage,
          // so start over.
          this.accumulated_buffer = Buffer.alloc(0)
        }

        // Add the new chunk to the end of the buffer.
        this.accumulated_buffer = Buffer.concat([this.accumulated_buffer, chunk])
      } 
      catch (err) {
        console.log("buffer error: ", err)
      }

      try {
        // Discard contents of buffer before the first 0xb0.  
        const startByte = this.accumulated_buffer.indexOf(0xb0)
        if (startByte == -1) return
        this.accumulated_buffer = this.accumulated_buffer.subarray(startByte)

        // At this point, the buffer begins with 0xb0, which could be the start of
        // a message, or, if something was lost, part of the CRC.  If part of the CRC,
        // this (partial) message will eventually be discarded.
      }
      catch (err) {
        console.log("buffer error: ", err)
      }

      try {
        // Look for 'RRRRRRRR' (eight 'R's), marking the end of the message.
	const firstR = this.accumulated_buffer.indexOf('RRRRRRRR')
        if (firstR == -1) return	// haven't received end of message yet

        // Copy the message to <message>, ignoring the 0xb0 at the beginning and
        // the 'R's at the end.
        const msg_buffer = this.accumulated_buffer.subarray(1, firstR)

        // Remove the message from the buffer.
        this.accumulated_buffer = this.accumulated_buffer.subarray(firstR+8)

        // We might now have a complete message.  The actual message is in bytes 0-107, 
        // and the CRC is in bytes 108-111.  
        if (msg_buffer.length != 112) return

        const rcvd_crc = Buffer.from(msg_buffer.subarray(108).toString(), 'hex').readUInt16BE()
        const message = Buffer.from(msg_buffer.subarray(0, 108).toString(), 'hex')

        // Calculate and Verify the CRC.
        let calc_crc = 0
        for (const byte of message) {
          calc_crc += byte
        }
        calc_crc = calc_crc & 0xffff

        if (rcvd_crc != calc_crc) throw new Error("invalid CRC, buffer:" + msg_buffer.toString())

        // Parse the message and emit the values.
        this.emitData("voltage", message)
        this.emitData("current", message)
        this.emitData("cycles", message)
        this.emitData("soc", message)
        this.emitData("temperature", message)
        this.emitData("energy", message)

        this.emitData("status", message)
        this.emitData("AFEStatus", message)

        this.emitData("cell1_voltage", message)
        this.emitData("cell2_voltage", message)
        this.emitData("cell3_voltage", message)
        this.emitData("cell4_voltage", message)
      }
      catch (err) {
        console.log("buffer error: ", err)
      }
    }

    initGATTConnection(){ 
        return new Promise((resolve,reject )=>{ this.deviceConnect().then(async ()=>{ 
            if (!this.gattServer) { 
                this.gattServer = await this.device.gatt() 
                this.battService = await this.gattServer.getPrimaryService("0000ffe0-0000-1000-8000-00805f9b34fb") 
                this.battCharacteristic = await this.battService.getCharacteristic("0000ffe4-0000-1000-8000-00805f9b34fb")
                }
                resolve(this)
             }) .catch((e)=>{ reject(e.message) }) }) 
    }

    initGATTNotifications() { 
        Promise.resolve(this.battCharacteristic.startNotifications().then(()=>{    
            this.battCharacteristic.on('valuechanged', buffer => {
                this.reassemble(buffer)
            })
        }))
    }
  
    async stopListening(){
        super.stopListening()
        if (this.battCharacteristic  && await this.battCharacteristic.isNotifying()) {
            await this.battCharacteristic.stopNotifications()
            this.battCharacteristic=null
        }
        if (await this.device.isConnected()){
               await this.device.disconnect()
        }
    }
}
module.exports=KilovaultHLXPlus
