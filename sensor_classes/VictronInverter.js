const VictronSensor = require("./Victron/VictronSensor");
const VC=require("./Victron/VictronConstants.js")
const BitReader = require('./_BitReader')

class VictronInverter extends VictronSensor{
  
    static ImageFile="VictronPhoenixSmart1600.webp"

    initSchema(){
        super.initSchema()
        this.addDefaultParam("id")

        this.addMetadatum('deviceState','', 'inverter device state', 
            (buff)=>{return VC.OperationMode.get(buff.readIntU8(0))})
            .default="electrical.inverters.{id}.state"

        const md = this.addMetadatum('alarmReason','', 'reason for alarm',
            (buff)=>{return buff.readIntU16LE(1)})
        .default="electrical.inverters.{id}.alarm"

        this.addDefaultPath('dcVoltage','electrical.inverters.dc.voltage') 
            .read=(buff)=>{return this.NaNif(buff.readInt16LE(3),0x7FFF)/100}

        this.addDefaultPath('acPower','electrical.inverters.ac.power') 
            .read=(buff)=>{return this.NaNif( buff.readUInt16LE(5), 0xFFFF )*this.powerFactor}
        
        this.addDefaultPath('acVoltage','electrical.inverters.ac.voltage') 

        this.addDefaultPath('acCurrent','electrical.inverters.ac.current') 
                
    }
    powerFactor = .8 //parameterize anon

    emitValuesFrom(decData){
        super.emitValuesFrom(decData)
        const br = new BitReader(decData.subarray(5))
        this.emit('acVoltage',
            this.NaNif(br.read_unsigned_int(15),0x7FFF)/100)
        this.emit('acCurrent',
            this.NaNif(br.read_unsigned_int(11),0x7FF)/10)
        const alarm = this.getPath("alarmReason").read(decData)
        if (alarm>0){
            this.emitAlarm("alarmReason",alarm)
        }
    }
    

}
module.exports=VictronInverter