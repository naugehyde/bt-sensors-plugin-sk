/*

*/
const VictronSensor = require ("./Victron/VictronSensor.js") 
const VC = require("./Victron/VictronConstants.js")
class VictronOrionXS extends VictronSensor{

    static async identify(device){
        return await this.identifyMode(device, 0x0F)
    }   
     initSchema() {
        super.initSchema()
        this.addDefaultParam("id")
        this.addMetadatum('deviceState','', 'device state', 
            (buff)=>{return VC.OperationMode.get(buff.readUInt8(0))})
            .default="electrical.chargers.{id}.state"

        this.addMetadatum('chargerError','', 'charger error',
            (buff)=>{return VC.ChargerError.get(buff.readUInt8(1))})
            .default="electrical.chargers.{id}.error"

        this.addMetadatum('outputVoltage','V', 'output voltage', 
            (buff)=>{return this.NaNif(buff.readInt16LE(2),0x7FF)/100})
            .default="electrical.chargers.{id}.output.voltage"
            
        
        this.addMetadatum('current','A','output current', 
            (buff)=>{return this.NaNif(buff.readUInt16LE(4),0xFFFF)/10})
            .default="electrical.chargers.{id}.output.current"
        this.addMetadatum('inputVoltage','V', 'input voltage', 
            (buff)=>{return this.NaNif(buff.readInt16LE(6),0x07FF)/100})
            .default="electrical.chargers.{id}.input.voltage"
        this.addMetadatum('inputCurrent','A','input current', 
            (buff)=>{return this.NaNif(buff.readUInt16LE(8),0xFFFF)/10})
            .default="electrical.chargers.{id}.input.current"
        this.addMetadatum('deviceOffReason','', 'device off reason', 
            (buff)=>{return VC.OffReasons.get(buff.readUInt32BE(10))})
            .default="electrical.chargers.{id}.offReason"    
        }

}
module.exports=VictronOrionXS