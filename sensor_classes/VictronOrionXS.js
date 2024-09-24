/*

*/
const VictronDevice = require ("./Victron/VictronDevice.js") 
const VC = require("./Victron/VictronConstants.js")
class VictronOrionXS extends VictronDevice{

    static async identify(device){
        return await this.identifyMode(device, 0x0F)
    }   
    static {
        this.metadata = new Map(super.getMetadata())

        this.addMetadatum('chargeState','', 'charge state', 
                        (buff)=>{return VC.OperationMode.get(buff.readUInt8(0))})
        this.addMetadatum('chargerError','', 'charger error',
            (buff)=>{return buff.readUInt8(1)})
        this.addMetadatum('outputVoltage','V', 'output voltage', 
            (buff)=>{return buff.readInt16LE(2)/100})
        this.addMetadatum('current','A','output current', 
            (buff)=>{return buff.readInt16LE(4)/10})
        this.addMetadatum('inputVoltage','V', 'input voltage', 
            (buff)=>{return buff.readInt16LE(6)/100})
        this.addMetadatum('inputCurrent','A','input current', 
            (buff)=>{return buff.readInt16LE(8)/10})
        this.addMetadatum('deviceOffReason','', 'device off reason', 
            (buff)=>{return VC.OffReasons(buff.readUInt32(10))})    
        }

}
module.exports=VictronOrionXS