/**
  
 */

const RenogySensor = require("./Renogy/RenogySensor.js");
const RC=require("./Renogy/RenogyConstants.js")

class RenogyRoverClient extends RenogySensor {


    initSchema(){
        //Buffer(73) [1, 3, 68, 32, 32, 82, 78, 71, 45, 67, 84, 82, 76, 45, 87, 78, 68, 51, 48, 7, 140, 0, 132, 0, 126, 0, 120, 0, 111, 0, 106, 100, 50, 0, 5, 0, 120, 0, 120, 0, 28, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 15, 0, 5, 0, 5, 2, 148, 0, 5, 206, 143, 34, 228, buffer: ArrayBuffer(8192), byteLength: 73, byteOffset: 6144, length: 73, Symbol(Symbol.toStringTag): 'Uint8Array']
        super.initSchema()
        this.addMetadatum('batteryType', '', "battery type")
        this.addMetadatum('batteryPercentage', 'ratio', "battery percentage",
             (buffer)=>{return buffer.readUInt16BE(3) })
        this.addMetadatum('batteryVoltage', 'V', "battery voltage",
            (buffer)=>{return buffer.readUInt16BE((5))/10})
        this.addMetadatum('batteryCurrent', 'A', 'battery current',
            (buffer)=>{return buffer.readUInt16BE((7))/100})
        this.addMetadatum('controllerTemperature', 'K', 'controller temperature',
            (buffer)=>{return buffer.readInt8((9))+273.15})
        this.addMetadatum('batteryTemperature', 'K', 'battery temperature',
            (buffer)=>{return buffer.readInt8((10))+273.15})
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
            this.sendReadFunctionRequest(0x1A, 0x1)

            const valChanged = async (buffer) => {
                resolve((buffer.readUInt8(4)))
            }
            this.readChar.once('valuechanged', valChanged )
        })
    }

    retrieveBatteryType(){
        return new Promise( async ( resolve, reject )=>{
        //Buffer(7) [255, 3, 2, 0, 1, 80, 80, buffer: ArrayBuffer(8192), byteLength: 7, byteOffset: 864, length: 7, Symbol(Symbol.toStringTag): 'Uint8Array']

            this.sendReadFunctionRequest(0xe004, 0x01)

            const valChanged = async (buffer) => {
                resolve(RC.BATTERY_TYPE[(buffer.readUInt8(4))])
            }
            this.readChar.once('valuechanged', valChanged )
        })
    }

    async retrieveModelID(){
        return new Promise( async ( resolve, reject )=>{

        await this.sendReadFunctionRequest(0x0c,0x08)
          
        this.readChar.once('valuechanged', async (buffer) => {
            if (buffer[2]!=0x10) 
                reject("Unknown error retrieving model ID") //???
            const model = buffer.subarray(3,17).toString().trim()
            resolve(model)           
        })
    })
    }
    async initGATTConnection() {
        await super.initGATTConnection()
        if (!this.deviceID)
            this.deviceID = await this.retrieveDeviceID()
        this.modelID=await this.retrieveModelID()

        this.batteryType = await this.retrieveBatteryType()
        this.emit('batteryType', this.batteryType)

        
    }


    getAllEmitterFunctions(){
        return [this.getAndEmitChargeInfo.bind(this)]
    }

    async getAndEmitChargeInfo(){
        return new Promise( async ( resolve, reject )=>{
            try {
                this.sendReadFunctionRequest(0x100, 0x22)

                this.readChar.once('valuechanged', buffer => {
                    this.emitValuesFrom(buffer)
                    resolve(this)
                })
                                
            } catch (error) {
                reject(error?.message??error)
            }
        })
    }
    
}
module.exports=RenogyRoverClient