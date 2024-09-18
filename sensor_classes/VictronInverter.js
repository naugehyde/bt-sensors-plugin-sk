const _Victron = require("./Victron/_Victron");
function toBinaryString(buff){
    return [...buff].map((b) => b.toString(2).padStart(8, "0")).join("");
    }
class VictronInverter extends _Victron{
    
    static async identify(device){

        try{
            const isVictron = (super.identify(device)!=null)
            if (!isVictron) return null
            
            if (await this.getMode(device)==0x03)
                return this

        } catch (e){
            console.log(e)
            return null
        }
        return null
    }

    static {
        var md
        this.metadata= new Map(super.getMetadata())
        this.addMetadatum('deviceState','', 'inverter device state', 
                (buff)=>{return this.constructor.OperationMode.get(buff.readIntU8(0))})
        md = this.addMetadatum('alarmReason','', 'reason for alarm',
                (buff)=>{return this.constructor.AlarmReason(buff.readIntU16LE(1))})
        md.notify=true

        this.addMetadatum('batteryVoltage','V', 'battery voltage', 
                (buff)=>{return buff.readInt16LE(3)/100})
        this.addMetadatum('acPower','W', 'AC power (in watts: Apparent Power * Power Factor)', 
                (buff)=>{const va = buff.readUInt16LE(5)
                    if (v == 0x7fff) 
                        return 0
                   else
                       return va*this.powerFactor
           
                })
        this.addMetadatum('acVoltage','V','AC Voltage',  (buff)=>{
            return parseInt(toBinaryString(buff.readUInt32LE(7)).slice(0,15),2)/100
        })

        this.addMetadatum('acCurrent','A', 'AC Current',
            (buff)=>{
                return parseInt(toBinaryString(buff.readUInt32LE(7)).slice(15,27),2)/10
            }
        )
                
    }
    powerFactor = .8 //parameterize anon

    emitValuesFrom(decData){
        super.emitValuesFrom(decData)
        const alarm = this.getMetadata().get("alarmReason").read(decData)
        if (alarm>0){
            this.emit(
                `ALARM #${alarm} from ${this.getDisplayName()})`, 
                { message: AlarmReason(alarm), state: 'alert'})
        }
    }
    

}
module.exports=VictronInverter