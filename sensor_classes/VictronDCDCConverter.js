const VictronDevice = require("./Victron/VictronDevice");
const VC=require("./Victron/VictronConstants.js")

class VictronDCDCConverter extends VictronDevice{
    
    static async identify(device){

        try{
            const isVictron = (super.identify(device)!=null)
            if (!isVictron) return null
            
            if (await this.getMode(device)==0x04)
                return this

        } catch (e){
            console.log(e)
            return null
        }
        return null
    }
   
    static {
        this.metadata= new Map(super.getMetadata())
        this.addMetadatum('chargeState','', 'device charge state', 
                (buff)=>{return VC.OperationMode.get(buff.readIntU8(0))})
        this.addMetadatum('chargerError','', 'charger error',
                (buff)=>{return VC.ChargerError.get(buff.readIntU8(1))})
        this.addMetadatum('inputVoltage','V', 'input voltage', 
                (buff)=>{return buff.readUInt16LE(2)/100})
        this.addMetadatum('outputVoltage','V', 'output voltage', 
                (buff)=>{const v = buff.readUInt16LE(4)/100
                    if (v == 0x7fff) 
                        return 0
                   else
                       return v
           
                })
        this.addMetadatum('offReason','', 'reason unit is off',
                (buff)=>{return VC.OffReasons.get(buff.readUInt32LE(6))})
                
    }
    emitValuesFrom(decData){
        this.emitData("chargeState",decData)
        this.emitData("chargerError",decData)
        this.emitData("inputVoltage",decData);
        this.emitData("outputVoltage",decData);
        this.emitData("offReason",decData);
       
    }
    

}
module.exports=VictronDCDCConverter 