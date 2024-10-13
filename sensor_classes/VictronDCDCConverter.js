const VictronSensor = require("./Victron/VictronSensor");
const VC=require("./Victron/VictronConstants.js")

class VictronDCDCConverter extends VictronSensor{
    
    static async identify(device){
        return await this.identifyMode(device,0x04)
    }
   
    async init(){
        await super.init()
        this.addMetadatum('deviceState','', 'device state', 
                (buff)=>{return VC.OperationMode.get(buff.readUInt8(0))})
        this.addMetadatum('chargerError','', 'charger error',
                (buff)=>{return VC.ChargerError.get(buff.readUInt8(1))})
        this.addMetadatum('inputVoltage','V', 'input voltage', 
                (buff)=>{return this.NaNif(buff.readUInt16LE(2),0xFFFF)/100})
        this.addMetadatum('outputVoltage','V', 'output voltage', 
                (buff)=>{return this.NaNif(buff.readInt16LE(4),0x7FFF)/100 })
        this.addMetadatum('offReason','', 'reason unit is off',
                (buff)=>{return VC.OffReasons.get(buff.readUInt32LE(6))})
                
    }    

}
module.exports=VictronDCDCConverter 