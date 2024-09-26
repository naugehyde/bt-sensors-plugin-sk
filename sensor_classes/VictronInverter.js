const VictronDevice = require("./Victron/VictronDevice");
const VC=require("./Victron/VictronConstants.js")


class VictronInverter extends VictronDevice{
    static async identify(device){
        return await this.identifyMode(device, 0x03)
    }
    

    static {
        var md
        this.metadata= new Map(super.getMetadata())
        this.addMetadatum('deviceState','', 'inverter device state', 
                (buff)=>{return VC.OperationMode.get(buff.readIntU8(0))})
        md = this.addMetadatum('alarmReason','', 'reason for alarm',
                (buff)=>{return buff.readIntU16LE(1)})
        md.notify=true

        this.addMetadatum('batteryVoltage','V', 'battery voltage', 
                (buff)=>{return buff.readInt16LE(3)/100})
        this.addMetadatum('acPower','W', 'AC power (in watts: Apparent Power * Power Factor)', 
                (buff)=>{const va = buff.readUInt16LE(5)
                    if (v == 0x7fff) 
                        return NaN
                   else
                       return va*this.powerFactor
           
                })
        this.addMetadatum('acVoltage','V','AC Voltage',  (buff)=>{
            return (buff.readUInt16BE(5)>>1)/10
        })

        this.addMetadatum('acCurrent','A', 'AC Current',
            (buff)=>{
                return ((buff.readUInt32BE(5)&0x7ffff)>>6)/10
            }
        )
                
    }
    powerFactor = .8 //parameterize anon

    emitValuesFrom(decData){
        super.emitValuesFrom(decData)
        const alarm = this.getMetadatum("alarmReason").read(decData)
        if (alarm>0){
            this.emit(
                `ALARM #${alarm} from ${this.getDisplayName()})`, 
                { message: VC.AlarmReason.get(alarm), state: 'alert'})
        }
    }
    

}
module.exports=VictronInverter