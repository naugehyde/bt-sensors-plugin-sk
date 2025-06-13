/**
 * Class to support Batteries with embedded Shenzhen Li-ion Battery Bodyguard Technology BMS 
 * Brands include Redodo, Litime PowerQueen and possibly others
 */


const BTSensor = require("../BTSensor");

const ProtectionStatus = {
 0x4:"Over Charge Protection", 
 0x20:"Over-discharge Protection", 
 0x40: "Charging Over Current Protection", 
 0x80: "Discharging Over Current Protection",
 0x100: "High-temp Protection" ,
 0x200:  "High-temp Protection", 
 0x400: "Low-temp Protection",
 0x800: "Low-temp Protection", 
 0x4000: "Short Circuit Protection"
}

class ShenzhenLiONBMS extends BTSensor{
    static Domain = BTSensor.SensorDomains.electrical
    static Commands = {
        product_registration: new Uint8Array([0x00, 0x00, 0x04, 0x01, 0x01, 0x55, 0xAA, 0x05]),
        disconnect_registration: new Uint8Array([0x00, 0x00, 0x04, 0x01, 0x02, 0x55, 0xAA, 0x06]),
        query_battery_status: new Uint8Array([0x00, 0x00, 0x04, 0x01, 0x13, 0x55, 0xAA, 0x17]),
        turn_on_charging: new Uint8Array([0x00, 0x00, 0x04, 0x01, 0x0a, 0x55, 0xAA, 0x0e]),
        turn_off_charging: new Uint8Array([0x00, 0x00, 0x04, 0x01, 0x0b, 0x55, 0xAA, 0x0f]),
        turn_on_discharge: new Uint8Array([0x00, 0x00, 0x04, 0x01, 0x0c, 0x55, 0xAA, 0x0e]),
        turn_off_discharge: new Uint8Array([0x00, 0x00, 0x04, 0x01, 0x0d, 0x55, 0xAA, 0x0f]),
        get_version: new Uint8Array([0x00, 0x00, 0x04, 0x01, 0x16, 0x55, 0xAA, 0x1a]),
        get_serial_number: new Uint8Array([0x00, 0x00, 0x04, 0x01, 0x10, 0x55, 0xAA, 0x14])
    };
    static async identify(device){
        return null
    }
    hasGATT(){
        return true
    }
    usingGATT(){
        return true
    }
    emitGATT(){
        this.characteristic.readValue()
        .then((buffer)=>
            this.emitValuesFrom( buffer)
        )

    }
     initSchema(){
        super.initSchema()
        this.getGATTParams()["useGATT"].default=true

        this.addDefaultParam("batteryID").default="house"
        
        this.addParameter(
         "numberOfCells",
            {
                title:"Number of cells",
                type: "integer",
                default: 4,
                minimum: 1,
                maximum: 16
            }
       )

    /*   
        'protection_state': t.slice(76, 80).reverse().join(""),//Non all zeros means the BMS is "protecting" the battery somehow. (00000004 = Over Charge Protection, 00000020 = Over-discharge Protection, 00000040 = Charging Over Current Protection, 00000080 = Discharging Over Current Protection, 00000100 = High-temp Protection, 00000200 = High-temp Protection, 00000400 = Low-temp Protection, 00000800 = Low-temp Protection, 00004000 = Short Circuit Protection)
		'heat': t.slice(68, 72).reverse().join(""),//discharge disabled due to app button = 00000080, heater_error = 00000002
		'balance_memory_active': t.slice(72, 76).reverse().join(""),//activates when the battery has saved information about what cell it will balance
		'failure_state': t.slice(80, 84).reverse().join("").slice(-3),//First numer/byte of the three regards cell_error, second number is also cell_error, third number is BMS_error
		'is_balancing': HexTo2Str(t.slice(84, 88).reverse().join("")),//each bit represents a cell, if the bit = 1 that cell is balancing
		'battery_state': t.slice(88, 90).reverse().join(""),//charge disabled = "0004", charging = "0001" (when charging active app will show estimated time untill fully charged), discharging/idle: "0000", unkown = "0002"
		'discharges_count': HexTo10Str(t.slice(96, 100).reverse().join("")),
		'discharges_amph_count': HexTo10Str(t.slice(100, 104).reverse().join("")),
*/
        this.addMetadatum('measuredTotalVoltage','V', 'measured total voltage',
                (buff)=>{return buff.readUInt32LE(8)/1000})
        
        this.addDefaultPath('voltage', "electrical.batteries.voltage")
            .read=(buff)=>{return buff.readUInt32LE(12)/1000}

        for(let cellNum=0; cellNum < this?.numberOfCells??4; cellNum++) {
            this.addMetadatum(`cell${cellNum+1}Voltage`,'V', `cell #${cellNum+1} voltage`,
                (buff)=>{return buff.readInt16LE(16+(cellNum*2)) })
            .default=`electrical.batteries.{batteryID}.cells.${cellNum+1}.voltage`
        }

        this.addDefaultPath('current','electrical.batteries.current')
            .read=(buff)=>{return buff.readInt32LE(48)/1000}

        this.addMetadatum('cellTemp','K', 'cell temperature',
                (buff)=>{return buff.readInt16LE(52) + 273.15})
            .default="electrical.batteries.{batteryID}.cells.temperature"

        this.addMetadatum('bmsTemp','K', 'bms temperature',
                (buff)=>{return buff.readInt16LE(54) + 273.15})
            .default="electrical.batteries.{batteryID}.bms.temperature"

        this.addDefaultPath('remainingAh','electrical.batteries.capacity.remaining')
            .read=(buff)=>{return this.buff.readUInt16LE(62)/100}

        this.addDefaultPath('actualAh','electrical.batteries.capacity.actual')
            .read=(buff)=>{return this.buff.readUInt16LE(64)/100}

        this.addMetadatum('heat','', 'discharge disabled due to app button = 00000080, heater_error = 00000002',
                (buff)=>{return buff.slice(68,72).reverse().join("")})
            .default="electrical.batteries.{batteryID}.heat"

        this.addMetadatum('balanceMemoryActive','', 'activates when the battery has saved information about what cell it will balance',
            (buff)=>{return buff.slice(72,76).reverse().join("")})
            .default="electrical.batteries.{batteryID}.balanceMemoryActive"

        this.addMetadatum('protectionState','', 'protection state',
                (buff)=>{return buff.slice(76,80).reverse().join("")})
            .default="electrical.batteries.{batteryID}.protectionState"

        this.addMetadatum('failureState','', 'failure state',
                (buff)=>{return buff.slice(80,84).reverse().join("").slice(-3)})
            .default="electrical.batteries.{batteryID}.failureState"
        
        this.addMetadatum('balanceState','', '1 = cell at offset is balancing',
                (buff)=>{return buff.slice(84,88).reverse().join("")})
            .default="electrical.batteries.{batteryID}.balanceState"

        this.addMetadatum('batteryState','', 'charge disabled = "0004", charging = "0001" (when charging active app will show estimated time untill fully charged), discharging/idle: "0000", unkown = "0002"',
            (buff)=>{return buff.slice(88,90).reverse().join("")})
        .default="electrical.batteries.{batteryID}.batteryState"

        this.addMetadatum('dischargeCount','', 'discharge count',
            (buff)=>{return buff.readUInt32LE(96)})
        .default="electrical.batteries.{batteryID}.dischargeCount"

        this.addMetadatum('dischargeAhCount','', 'discharge ah count',
            (buff)=>{return buff.readUInt32LE(100)})
        .default="electrical.batteries.{batteryID}.dischargeAhCount"
    
        this.addDefaultPath( 'soc',"electrical.batteries.capacity.stateOfCharge") 
            .read=(buff)=>{return buff.readUInt16LE(90)/100}
        
       
        this.getJSONSchema().properties.params.required=["batteryID", "numberOfCells" ]
    }

    async initGATTConnection(){ 

        return new Promise((resolve,reject )=>{ 
            this.deviceConnect().then(async ()=>{ 
            if (!this.gattServer) { 
                this.gattServer = await this.device.gatt() 
                this.service = await this.gattServer.getPrimaryService("0000ffe0-0000-1000-8000-00805f9b34fb") 
                this.rxCharacteristic = await this.service.getCharacteristic("0000ffe1-0000-1000-8000-00805f9b34fb")
                this.txCharacteristic = await this.service.getCharacteristic("0000ffe2-0000-1000-8000-00805f9b34fb")
            }
            resolve(this)
        })})
    }
    async initGATTNotifications() { 
        await this.txCharacteristic.writeValue( Buffer.from(this.constructor.Commands.query_battery_status))
        await this.rxCharacteristic.startNotifications()    
        this.rxCharacteristic.on('valuechanged', buffer => {
                this.emitValuesFrom(buffer)
        })
    }
  
    async stopListening(){
        super.stopListening()
        if (this.rxCharacteristic  && await this.rxCharacteristic.isNotifying()) {
            await this.rxCharacteristic.stopNotifications()
            this.rxCharacteristic=null
        }
        if (await this.device.isConnected()){
            await this.device.disconnect()
        }
    }
}
module.exports=ShenzhenLiONBMS