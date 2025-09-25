
const VictronSensor = require("./Victron/VictronSensor");
const VC=require("./Victron/VictronConstants.js")
const int24 = require("int24");
const _BitReader = require("./_BitReader.js");
class VictronDCEnergyMeter extends VictronSensor{
    
     async init(){
        await super.init()
        try {
        if (this.encryptionKey){
            const decData = this.decrypt(this.getManufacturerData(0x02e1))
            if (decData)
                this.auxMode=decData.readInt8(8)&0x3   
        }
        } catch(e){ 
            this.debug(`Unable to determine device AuxMode. ${e.message}`)
            this.debug(e)
            this.auxMode=VC.AuxMode.DISABLED
        }
        switch(this.auxMode){
            case VC.AuxMode.STARTER_VOLTAGE:
                this.addMetadatum('starterVoltage','V',  'starter battery voltage', 
                        (buff,offset=0)=>{return buff.readInt16LE(offset)/100})
                        .default="electrical.batteries.starter.voltage"
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
                    .default="electrical.batteries.house.temperature"

                    break;
            default:
                break
        }
    }
    initSchema(){
        super.initSchema()
        this.addDefaultParam("id")
        this.addMetadatum('meterType','', 'meter type', 
            (buff)=>{return VC.MeterType.get( buff.readInt16LE(0))})
            .default="electrical.meters.{id}.type"

        this.addMetadatum('voltage','V','voltage',
            (buff)=>{return buff.readInt16LE(2)/100})
            .default="electrical.meters.{id}.voltage"
         
        this.addMetadatum('alarm','', 'alarm', 
            (buff)=>{return buff.readUInt16LE(4)})
           .default="electrical.meters.{id}.alarm"
        this.getPath("alarm").notify=true
        this.addMetadatum('current','A', 'current')
        .default="electrical.meters.{id}.current"       
 
    }
    
    emitValuesFrom(decData){
        this.emitData("meterType",decData,0)
        this.emitData("voltage",decData,2);
        const alarm = this.getPath("alarm").read(decData,4)
        if (alarm>0){
            this.emitAlarm("alarm",alarm)
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