const VictronSensor = require ("./Victron/VictronSensor.js") 
const VC = require("./Victron/VictronConstants.js")
class VictronSolarCharger extends VictronSensor{

    static async identify(device){
        return await this.identifyMode(device, 0x01)
    }   

    async init() {
        await super.init()
        this.initMetadata()
    }
    initMetadata() { 
    this.addMetadatum('chargeState','', 'charge state', 
        (buff)=>{return VC.OperationMode.get(buff.readUInt8(0))})
    this.addMetadatum('chargerError','', 'charger error',
        (buff)=>{return VC.ChargerError.get(buff.readUInt8(1))})
    this.addMetadatum('voltage','V', 'charger battery voltage', 
        (buff)=>{return this.NaNif(buff.readInt16LE(2),0x7FFF)/100})
    this.addMetadatum('current','A','charger battery current', 
        (buff)=>{return this.NaNif(buff.readInt16LE(4),0x7FFF)/10})
    this.addMetadatum('yield','Wh', 'yield today in Watt-hours', 
        (buff)=>{return this.NaNif(buff.readUInt16LE(6),0xFFFF)*10})
    this.addMetadatum('solarPower','W', 'solar power', 
        (buff)=>{return this.NaNif(buff.readUInt16LE(8),0xFFFF)})    
    this.addMetadatum('externalDeviceLoad','A', 'external device load', 
        (buff)=>{return this.NaNif(buff.readUInt16LE(10)&0x1FF,0x1FF)/10})    
    }
}
module.exports=VictronSolarCharger 