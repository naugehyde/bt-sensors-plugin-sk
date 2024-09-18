const BTSensor = require("../BTSensor");
const _Victron = require("./_Victron");

class VictronSolarCharger extends _Victron{

    static async identify(device){

        try{
            const isVictron = (super.identify(device)!=null)
            if (!isVictron) return null
            
            if (await this.getMode(device)==0x01)
                return this

        } catch (e){
            console.log(e)
            return null
        }
        return null
    }
    static {
        this.metadata = new Map(super.getMetadata())

        this.addMetadatum('chargeState','', 'charge state', 
                        (buff)=>{return this.constructor.OperationMode(buff.readUInt8(0))})
 
        this.addMetadatum('chargerError','', 'charger error',
            (buff)=>{this.constructor.ChargerError.get(buff.readUInt8(1))})
        this.addMetadatum('voltage','V', 'charger battery voltage', 
            (buff)=>{return buff.readInt16LE(2)/100})
        this.addMetadatum('current','A','charger battery current', 
            (buff)=>{return buff.readInt16LE(4)/10})
        this.addMetadatum('yield','Wh', 'yield today', 
            (buff)=>{return buff.readUInt16LE(6)*10})
        this.addMetadatum('solarPower','W', 'solar power', 
            (buff)=>{return buff.readUInt16LE(8)})    
        this.addMetadatum('externalDeviceLoad','A', 'external device load', 
            (buff)=>{return buff.readUInt16LE(10)})    
        }

    emitValuesFrom(decData){
        this.getMetadata().forEach((datum, tag)=>{
                this.emitData(tag, decData)
        })
    }
    

}
module.exports=VictronSolarCharger 