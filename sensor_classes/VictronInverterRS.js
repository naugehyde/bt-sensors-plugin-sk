const VictronDevice = require("./Victron/VictronDevice");
const VC=require("./Victron/VictronConstants.js")

function toBinaryString(buff){
    return [...buff].map((b) => b.toString(2).padStart(8, "0")).join("");
    }
class VictronInverterRS extends VictronDevice{
    static async identify(device){
        return await this.identifyMode(device, 0x06)
    }
    

    static {
        var md
        this.metadata= new Map(super.getMetadata())
        this.addMetadatum('deviceState','', 'inverter device state', 
                (buff)=>{return VC.OperationMode.get(buff.readIntU8(0))})
        md = this.addMetadatum('chargerError','', 'charger error',
                (buff)=>{return VC.ChargerError(buff.readIntU8(1))})
        md.notify=true

        this.addMetadatum('batteryVoltage','V', 'battery voltage', 
            (buff)=>{return this.NaNif(buff.readInt16LE(2),0x7FFF)/100})
        this.addMetadatum('pvPower','W', 'PV power', 
            (buff)=>{return this.NaNif(buff.readUInt16LE(4), 0xffff)})
        this.addMetadatum('yieldToday','W', 'yield yoday in watts', 
            (buff)=>{return this.NaNif(buff.readUInt16LE(6), 0xffff)*10})
        this.addMetadatum('acOutPower','W', 'AC out power in watts', 
            (buff)=>{this.NaNif(buff.readInt16LE(8), 0x7fff)})                
    }

    emitValuesFrom(decData){
        super.emitValuesFrom(decData)
        const error = this.getMetadatum("chargerError").read(decData)
        if (error>0){
            this.emit(
                `Charger Error #${error} from ${this.getDisplayName()})`, 
                { message: VC.ChargerError.get(error), state: 'error'})
        }
    }
    

}
module.exports=VictronInverterRS