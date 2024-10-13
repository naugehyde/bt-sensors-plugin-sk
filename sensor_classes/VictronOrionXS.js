/*

*/
const VictronSensor = require ("./Victron/VictronSensor.js") 
const VC = require("./Victron/VictronConstants.js")
class VictronOrionXS extends VictronSensor{

    static async identify(device){
        return await this.identifyMode(device, 0x0F)
    }   
    async init() {
        await super.init()
        this.addMetadatum('deviceState','', 'device state', 
            (buff)=>{return VC.OperationMode.get(buff.readUInt8(0))})
        this.addMetadatum('chargerError','', 'charger error',
            (buff)=>{return VC.ChargerError.get(buff.readUInt8(1))})
        this.addMetadatum('outputVoltage','V', 'output voltage', 
            (buff)=>{return this.NaNif(buff.readInt16LE(2),0x7FF)/100})
        this.addMetadatum('current','A','output current', 
            (buff)=>{return this.NaNif(buff.readUInt16LE(4),0xFFFF)/10})
        this.addMetadatum('inputVoltage','V', 'input voltage', 
            (buff)=>{return this.NaNif(buff.readInt16LE(6),0x07FF)/100})
        this.addMetadatum('inputCurrent','A','input current', 
            (buff)=>{return this.NaNif(buff.readUInt16LE(8),0xFFFF)/10})
        this.addMetadatum('deviceOffReason','', 'device off reason', 
            (buff)=>{return VC.OffReasons(buff.readUInt32(10))})    
        }

}
module.exports=VictronOrionXS