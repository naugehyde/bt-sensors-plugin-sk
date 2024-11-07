/**
  
 */

const RenogySensor = require("./Renogy/RenogySensor.js");
const RC=require("./Renogy/RenogyConstants.js")
class RenogyRoverClient extends RenogySensor {

    
    static async identify(device){
        return new Promise( async ( resolve, reject )=>{
            if (!await super.identify(device)) resolve()
            try {
            await device.connect()
            //error new Uint8Array([255, 3, 16, 0, 100, 0, 135, 0, 0, 20, 22, 0, 0, 0, 0, 86, 82, 52, 48, 109, 165])
            //new Uint8Array([255, 3, 16, 32, 32, 82, 78, 71, 45, 67, 84, 82, 76, 45, 82, 86, 82, 52, 48, 55, 36])
            
            const rw = await this.getReadWriteCharacteristics()
            await this.sendReadFunctionRequest(rw.write,0xFF,0x0c,0x08)
          
            await rw.read.startNotifications()
            rw.read.once('valuechanged', async (buffer) => {
                rw.read.stopNotifications()
                await device.disconnect()
                if (buffer[2]!=0x10) resolve() //???
                const model = buffer.subarray(3,17).toString().trim()

                console.log(`Found ${model}`)

                if (model.startsWith('RNG-CTRL-RVR' ) || model.startsWith('RNG-CTRL-WND' )
                    || model.startsWith('RNG-CTRL-ADV' ) )
                    resolve(this)           
                else
                    resolve()
            })
            
        } catch (error) {
            reject(error.message)
        }
        })
    }
  
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
            (buffer)=>{return buffer.readUInt32BE(59)})
        this.addMetadatum('loadStatus', '',  'load status',
            (buffer)=>{return RC.LOAD_STATE[buffer.readUInt8(67)>>7]})

        this.addMetadatum('chargingStatus', '', 'charging status',
            (buffer)=>{return RC.CHARGING_STATE[buffer.readUInt8(68)]})
    }
    
    retrieveDeviceID(){
        return new Promise( async ( resolve, reject )=>{
            this.sendFunctionRequest(0x1A, 0x1)

            const valChanged = async (buffer) => {
                resolve((buffer.readUInt8(4)))
            }
            this.readChar.once('valuechanged', valChanged )
        })
    }

    getBatteryType(){
        return new Promise( async ( resolve, reject )=>{
            this.sendFunctionRequest(0xe004, 0x01)

            const valChanged = async (buffer) => {
                resolve(RC.BATTERY_TYPE[(buffer.readUInt8(4))])
            }
            this.readChar.once('valuechanged', valChanged )
        })
    }
    async initGATTConnection() {
        await super.initGATTConnection()
        this.batteryType = await this.getBatteryType()
        this.emit('batteryType', this.batteryType)
    }


    async getAllEmitterFunctions(){
        return [this.getAndEmitChargeInfo]
    }

    async getAndEmitChargeInfo(){
        return new Promise( async ( resolve, reject )=>{
            this.sendReadFunctionRequest(0x1000, 0x22)

            this.readChar.once('valuechanged', buffer => {
                emitValuesFrom(buffer)
                resolve(this)
            })
        })
    }
    
}
module.exports=RenogyRoverClient