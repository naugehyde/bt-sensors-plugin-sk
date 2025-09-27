/**
  
 */

const RenogySensor = require("./Renogy/RenogySensor.js");
const RC=require("./Renogy/RenogyConstants.js")
class RenogyInverter extends RenogySensor {

    static ImageFile = "RenogyInverter.jpg"

    initSchema(){
        super.initSchema()
        this.addMetadatum('batteryType', '', "battery type")
    
        this.addMetadatum('ueiVoltage','V','UEI Voltage',
            (buffer)=>{return buffer.readUInt16BE(3)/10})
        this.addMetadatum('ueiCurrent','V','UEI current',
            (buffer)=>{return buffer.readUInt16BE(5)/10})
        this.addMetadatum('voltage','V','voltage',
            (buffer)=>{return buffer.readUInt16BE(7)/10}) 
        this.addMetadatum('loadCurrent','A','load current',
            (buffer)=>{return buffer.readUInt16BE(9)})
        this.addMetadatum('frequency','hz','frequency',
            (buffer)=>{return buffer.readUInt16BE(11)/100})
        this.addMetadatum('temperature','K','temperature',
            (buffer)=>{return (buffer.readUInt16BE(13)/10)+273.15})

        this.addMetadatum('solarVoltage','V', 'solar voltage',
            (buffer)=>{return buffer.readUInt16BE(3)/10})
        this.addMetadatum('solarCurrent','A', 'solar current',
            (buffer)=>{return buffer.readUInt16BE(5)/10})
        this.addMetadatum('solarPower','W', 'solar power',
            (buffer)=>{return buffer.readUInt16BE(7)})
        this.addMetadatum('solarChargingStatus', '', 'solar charging state',
            (buffer)=>{return RC.CHARGING_STATE[buffer.readUInt16BE(9)]})
        this.addMetadatum('solarChargingPower', 'W', 'solar charging power',
            (buffer)=>{return buffer.readUInt16BE(11)})

        this.addMetadatum('loadPower','W','load power',
            (buffer)=>{return buffer.readUInt16BE(3)})
        this.addMetadatum('chargingCurrent','A','charging current',
            (buffer)=>{return buffer.readUInt16BE(5)/10})
            
        }
    
    getBatteryType(){
        return new Promise( async ( resolve, reject )=>{
            this.sendReadFunctionRequest( 0xe004, 0x01)

            const valChanged = async (buffer) => {
                resolve(RC.BATTERY_TYPE[(buffer.readUInt8(4))])
            }
            this.readChar.once('valuechanged', valChanged )
        })
    }

    retrieveModelID(){
        return new Promise( async ( resolve, reject )=>{

        await this.sendReadFunctionRequest(0x10d7,0x08)
          
        this.readChar.once('valuechanged', async (buffer) => {
            if (buffer[2]!=0x10) 
                reject("Unknown error retrieving model ID") //???
            const model = buffer.subarray(3,17).toString().trim()
            resolve(model)           
        })
    })
    }

    getAndEmitInverterStats(){
        return new Promise( async ( resolve, reject )=>{

            await this.sendReadFunctionRequest(0xfa0, 0xA)
        
            this.readChar.once('valuechanged', (buffer) => {
                ["ueiVoltage","ueiCurrent", "voltage", "loadCurrent", "frequency","temperature"].forEach((tag)=>
                    this.emitData( tag, buffer ))
                
                resolve(this)
            })
        })
    }

    getAndEmitSolarCharging(){
        return new Promise( async ( resolve, reject )=>{

            await this.sendReadFunctionRequest(0x10e9, 0x7)
        
            this.readChar.once('valuechanged', (buffer) => {
                ["solarVoltage","solarCurrent", "solarPower", "solarChargingStatus", "solarChargingPower"].forEach((tag)=>
                    this.emitData( tag, buffer ))
                
                resolve(this)
            })
        })
    }

    getAndEmitInverterLoad(){
        return new Promise( async ( resolve, reject )=>{
            
            await this.sendReadFunctionRequest(0x113a, 0x6)
        
            this.readChar.once('valuechanged', (buffer) => {
                ["loadPower", "chargingCurrent"].forEach((tag)=>
                    this.emitData( tag, buffer ))
                
                resolve(this)
            })
        })
    }
    getAllEmitterFunctions(){
        return [
            this.getAndEmitInverterLoad.bind(this), 
            this.getAndEmitInverterStats.bind(this), 
            this.getAndEmitSolarCharging.bind(this)]
    }
    async initGATTConnection() {
        await super.initGATTConnection()
        this.batteryType = await this.getBatteryType()
        this.emit('batteryType', this.batteryType)
    }
}
module.exports=RenogyInverter