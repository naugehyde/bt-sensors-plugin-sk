const _Victron = require("./Victron/_Victron");

class VictronDCDCConverter extends _Victron{
    
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
    async init(){
        super.init()
        const modeCurrent = await this.getAuxModeAndCurrent()
        this.auxMode= modeCurrent.auxMode
        switch(this.auxMode){
            case AuxMode.STARTER_VOLTAGE:
                this.constructor.metadata.set('starterVoltage',{unit:'V', description: 'starter battery voltage', 
                        read: (buff,offset=0)=>{return buff.readInt16LE(offset)/100}})
                        break;

            case AuxMode.TEMPERATURE:
                this.constructor.metadata.set('temperature',{unit:'K', description: 'House battery temperature', 
                    read: (buff,offset=0)=>{
                        const temp = buff.readUInt16LE(offset)
                        if (temp==0xffff) 
                            return null
                        else 
                            return temp / 100
                    }})
                    break;
            default:
                break
        }
    }
    static {
        this.metadata= new Map(super.getMetadata())
        this.addMetadatum('chargeState','', 'device charge state', 
                (buff)=>{return this.constructor.OperationMode.get(buff.readIntU8(0))})
        this.addMetadatum('chargerError','', 'charger error',
                (buff)=>{return this.constructor.cChargerError(buff.readIntU8(1))})
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
                (buff)=>{return ChargerError.get(buff.readUInt32LE(6))})
                
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