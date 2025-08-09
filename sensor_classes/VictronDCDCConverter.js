const VictronSensor = require("./Victron/VictronSensor");
const VC=require("./Victron/VictronConstants.js")

class VictronDCDCConverter extends VictronSensor{
    
   
    initSchema(){
        super.initSchema()
        this.addDefaultParam("id")

        this.addMetadatum('deviceState','', 'device state', 
                (buff)=>{return VC.OperationMode.get(buff.readUInt8(0))})
        .default="electrical.chargers.{id}.state"
        this.addMetadatum('chargerError','', 'charger error',
                (buff)=>{return VC.ChargerError.get(buff.readUInt8(1))})
        .default="electrical.chargers.{id}.error"

        this.addMetadatum('inputVoltage','V', 'input voltage', 
                (buff)=>{return this.NaNif(buff.readUInt16LE(2),0xFFFF)/100})
        .default="electrical.chargers.{id}.input.voltage"

        this.addMetadatum('outputVoltage','V', 'output voltage', 
                (buff)=>{return this.NaNif(buff.readInt16LE(4),0x7FFF)/100 })
        .default="electrical.chargers.{id}.output.voltage"

        this.addMetadatum('offReason','', 'reason unit is off',
                (buff)=>{return VC.OffReasons.get(buff.readUInt32LE(6))})
        .default="electrical.chargers.{id}.offReason"

                
    }    

}
module.exports=VictronDCDCConverter 