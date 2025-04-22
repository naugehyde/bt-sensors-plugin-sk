
const VictronSensor = require("./Victron/VictronSensor");
const VC=require("./Victron/VictronConstants.js")
const int24 = require("int24");
const _BitReader = require("./_BitReader.js");
class VictronDCEnergyMeter extends VictronSensor{
    
    static async identify(device){
        return await this.identifyMode(device, 0x0D)
    }
    async init(){
        await super.init()
        this.addMetadatum('meterType','', 'meter type', 
            (buff)=>{return VC.MeterType.get( buff.readInt16LE(0))})
        this.addMetadatum('voltage','','voltage',
            (buff)=>{return buff.readInt16LE(2)/100})
        this.addMetadatum('alarm','', 'alarm', 
            (buff)=>{return buff.readUInt16LE(4)})
        try {
            if (this.encryptionKey){
                const decData = this.decrypt(this.getManufacturerData(0x02e1))
                if (decData)
                    this.auxMode=decData.readInt8(8)&0x3   
            }
        } catch (e) { 
            this.debug(`Unable to determine device AuxMode. ${e.message}`)
            this.debug(e)
            this.auxMode=VC.AuxMode.DISABLED
        }
          
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

        this.emit("current", 
            this.NaNif( new _BitReader(decData.subarray(8,11)).read_signed_int(22),0x3FFFFF)/1000)
  
    }
    

}
module.exports=VictronDCEnergyMeter 