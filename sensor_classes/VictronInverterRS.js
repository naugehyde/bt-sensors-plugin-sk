const VictronSensor = require("./Victron/VictronSensor");
const VC=require("./Victron/VictronConstants.js")

function toBinaryString(buff){
    return [...buff].map((b) => b.toString(2).padStart(8, "0")).join("");
    }
class VictronInverterRS extends VictronSensor{

    static ImageFile = "VictronInverterRS.webp"

     initSchema() {
        super.initSchema()
        this.addDefaultParam("id")
        this.addMetadatum('deviceState','', 'inverter device state', 
            (buff)=>{return VC.OperationMode.get(buff.readIntU8(0))})
            .default='electrical.inverters.{id}.state'    

        const md = this.addMetadatum('chargerError','', 'charger error',
            (buff)=>{return VC.ChargerError(buff.readIntU8(1))})
            md.default='electrical.inverters.{id}.error'
            md.notify=true

        this.addMetadatum('batteryVoltage','V', 'battery voltage', 
            (buff)=>{return this.NaNif(buff.readInt16LE(2),0x7FFF)/100})
            .default='electrical.inverters.{id}.battery.voltage'
        .
        this.addMetadatum('pvPower','W', 'PV power', 
            (buff)=>{return this.NaNif(buff.readUInt16LE(4), 0xffff)})
            .default='electrical.inverters.{id}.power'
        
        this.addMetadatum('yieldToday','W', 'yield yoday in watts', 
            (buff)=>{return this.NaNif(buff.readUInt16LE(6), 0xffff)*10})
            .default='electrical.inverters.{id}.yieldToday'
 
        this.addMetadatum('acOutPower','W', 'AC out power in watts', 
            (buff)=>{this.NaNif(buff.readInt16LE(8), 0x7fff)}) 
            .default='electrical.inverters.{id}.ac.power'
              
    }

    emitValuesFrom(decData){
        super.emitValuesFrom(decData)
        const error = this.getPath("chargerError").read(decData)
        if (error>0){
            this.emit(
                `Charger Error #${error} from ${this.getDisplayName()})`, 
                { message: VC.ChargerError.get(error), state: 'error'})
        }
    }
    

}
module.exports=VictronInverterRS