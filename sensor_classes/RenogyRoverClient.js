/**
  
 */

const RenogySensor = require("./Renogy/RenogySensor.js");
const RC=require("./Renogy/RenogyConstants.js")
const crc16Modbus = require('./Renogy/CRC')
class RenogyRoverClient extends RenogySensor {

    3
    static async identify(device){
        return new Promise( async ( resolve, reject )=>{
            if (!await super.identify(device)) resolve()
            try {
            await device.connect()
            //error new Uint8Array([255, 3, 16, 0, 100, 0, 135, 0, 0, 20, 22, 0, 0, 0, 0, 86, 82, 52, 48, 109, 165])
            //new Uint8Array([255, 3, 16, 32, 32, 82, 78, 71, 45, 67, 84, 82, 76, 45, 82, 86, 82, 52, 48, 55, 36])
            const gattServer = await device.gatt()
            const txService= await gattServer.getPrimaryService(this.TX_SERVICE)
            const rxService= await gattServer.getPrimaryService(this.RX_SERVICE)
            const readChar = await rxService.getCharacteristic(this.NOTIFY_CHAR_UUID)
            const writeChar = await txService.getCharacteristic(this.WRITE_CHAR_UUID)
    
            //RoverClient
            var b = Buffer.from([0xFF,0x03,0x0,0xc,0x0,0x8])
            var crc = crc16Modbus(b)
        
            await writeChar.writeValue(
                Buffer.concat([b,Buffer.from([crc.h,crc.l])], b.length+2), 
                { offset: 0, type: 'request' })
            await readChar.startNotifications()
            readChar.once('valuechanged', async (buffer) => {
                readChar.stopNotifications()
                await device.disconnect()
                if (buffer[5]==0x0) resolve()
                
                if (buffer.subarray(3,17).toString().trim()=="RNG-CTRL-RVR")
                    resolve(this)           
                else
                    resolve()
            })
            
        } catch (error) {
            reject(error.message)
        }
        })
    }
  
    characteristics=[]
    async init(){
        await super.init()
        this.initMetadata()
    }

    initMetadata(){
        this.addMetadatum('batteryType', '', "battery type")
        this.addMetadatum('batteryPercentage', 'ratio', "battery percentage",
             (buffer)=>{return buffer.readUInt16BE(3) })
        this.addMetadatum('batteryVoltage', 'V', "battery voltage",
            (buffer)=>{return buffer.readUInt16BE((5))/10})
        this.addMetadatum('batteryCurrent', 'A', 'battery current',
            (buffer)=>{return buffer.readUInt16BE((7))/100})
        this.addMetadatum('controllerTemperature', 'K', 'controller temperature',
            (buffer)=>{return buffer.readInt8((9))-128+273.15})
        this.addMetadatum('batteryTemperature', 'K', 'battery temperature',
            (buffer)=>{return buffer.readInt8((10))-128+273.15})
        this.addMetadatum('loadVoltage', 'V', 'load voltage',
            (buffer)=>{return buffer.readUInt16BE((11))/10})
        this.addMetadatum('loadCurrent',  'A', 'load current',
            (buffer)=>{return buffer.readUInt16BE((13))/100})
        this.addMetadatum('loadPower', 'W', 'load power',
            (buffer)=>{return buffer.readUInt16BE((15))})
        this.addMetadatum('pvVoltage', 'V', 'pv voltage',
            (buffer)=>{return buffer.readUInt16BE((17))/10})
        this.addMetadatum('pvCurrent', 'A', 'pv current',
            (buffer)=>{return buffer.readUInt16BE((19))/100})
        this.addMetadatum('pvPower', 'W', 'pv power',
            (buffer)=>{return buffer.readUInt16BE(21)})
        this.addMetadatum('maxChargingPowerToday', 'W', 'max charging power today',
            (buffer)=>{return buffer.readUInt16BE(33)})
        this.addMetadatum('maxDischargingPowerToday', 'W', 'max discharging power today',
            (buffer)=>{return buffer.readUInt16BE(35)})
        this.addMetadatum('chargingAmpHoursToday', 'Ah', 'charging amp hours today',
            (buffer)=>{return buffer.readUInt16BE(37)})
        this.addMetadatum('dischargingAmpHoursToday', 'Ah', 'discharging amp hours today',
            (buffer)=>{return buffer.readUInt16BE(39)})
        this.addMetadatum('powerGenerationToday', 'W', 'power generation today',
            (buffer)=>{return buffer.readUInt16BE(41)})
        this.addMetadatum('powerConsumptionToday', 'W', 'power consumption today',
            (buffer)=>{return buffer.readUInt16BE(43)})
        this.addMetadatum('powerGenerationTotal', 'W', 'power generation total',
            (buffer)=>{return buffer.readUInt32BE(21)})
        this.addMetadatum('loadStatus', '',  'load status',
            (buffer)=>{return RC.LOAD_STATE[buffer.readUInt8(67)>>7]})

        this.addMetadatum('chargingStatus', '', 'charging status',
            (buffer)=>{return RC.CHARGING_STATE[buffer.readUInt8(68)]})
    }
    
    _getBatteryType(){
        return new Promise( async ( resolve, reject )=>{

            var b = Buffer.from([0xFF,3,224,4,0,1])
            var crc = crc16Modbus(b)
            
            await this.writeChar.writeValue(
                    Buffer.concat([b,Buffer.from([crc.h,crc.l])], b.length+2), 
                    { offset: 0, type: 'request' })

            const valChanged = async (buffer) => {
                resolve(RC.BATTERY_TYPE[(buffer.readUInt8(4))])
            }
            this.readChar.once('valuechanged', valChanged )
        })
    }
    async initGATTConnection() {
        await super.initGATTConnection()
        this.batteryType = await this._getBatteryType()
        this.emit('batteryType', this.batteryType)
    }
    emitGATT(){

    }
    async initGATTNotifications() {
        
        var b = Buffer.from([0xFF,0x03,0x1,0x0,0x0,34])
        var crc = crc16Modbus(b)
        
        await this.writeChar.writeValue(
            Buffer.concat([b,Buffer.from([crc.h,crc.l])], b.length+2), 
            { offset: 0, type: 'request' })

        this.readChar.on('valuechanged', buffer => {
            emitValuesFrom(buffer)
        })
    }

    hasGATT(){
        return false //No need to present GATT option as that's the Renogy's only mode 
    }
    usingGATT(){
        return true
    }
    
    getGATTDescription(){
        return ""
    }

    async stopListening(){
        super.stopListening()
    
        await this.readChar.stopNotifications()
        
        if (await this.device.isConnected()){
            await this.device.disconnect()
            this.debug(`Disconnected from ${ this.getName()}`)
        }
    }
}
module.exports=RenogyRoverClient