const VictronDevice = require("./Victron/VictronDevice");
const VC=require("./Victron/VictronConstants.js")

class VictronDCEnergyMeter extends VictronDevice{
    
    static async identify(device){
        return await this.identifyMode(device, 0x0D)
    }
    async init(){
        await super.init()
        const modeCurrent =  this.getAuxModeAndCurrent()
        this.auxMode= modeCurrent.auxMode
        switch(this.auxMode){
            case VC.AuxMode.STARTER_VOLTAGE:
                this.addMetadatum('starterVoltage','V',  'starter battery voltage', 
                        (buff,offset=0)=>{return buff.readInt16LE(offset)/100})
                        break;

            case VC.AuxMode.TEMPERATURE:
                this.addMetadatum('temperature','K','House battery temperature', 
                    (buff,offset=0)=>{
                        const temp = buff.readUInt16LE(offset)
                        if (temp==0xffff) 
                            return null
                        else 
                            return temp / 100
                    })
                    break;
            default:
                break
        }
    }
    static { 
        this.metadata = new Map(super.getMetadata())
        this.addMetadatum('meterType','', 'meter type', 
                (buff)=>{return VC.MeterType.get( buff.readInt16LE(0))})
        this.addMetadatum('voltage','','voltage',
                (buff)=>{return buff.readInt16LE(2)/100})
        this.addMetadatum('alarm','', 'alarm', 
                (buff)=>{return buff.readUInt16LE(4)})
        this.addMetadatum('current','A', 'current')    
    }
    emitValuesFrom(decData){
        this.emitData("meterType",decData,0)
        this.emitData("voltage",decData,2);
        const alarm = this.getMetadatum("alarm").read(decData,4)
        if (alarm>0){
            this.emit(
                `ALARM #${alarm} from ${this.getDisplayName()})`, 
                { message: AlarmReason(alarm), state: 'alert'})
        }
        switch(this.auxMode){
            case VC.AuxMode.STARTER_VOLTAGE:
                this.emitData("starterVoltage",decData,6);
                break;
            case VC.AuxMode.TEMPERATURE:
                this.emitData("temperature",decData,6);
                break;
            default:
                break
            }      
        this.emit("current", this.getAuxModeAndCurrent(8,decData).current)
  
    }
    

}
module.exports=VictronDCEnergyMeter 