const _Victron = require("./_Victron");

const MeterType = new Map([
    [-9, 'SOLAR_CHARGER'],
    [-8, 'WIND_CHARGER'],
    [-7, 'SHAFT_GENERATOR'],
    [-6, 'ALTERNATOR'],
    [-5, 'FUEL_CELL'],
    [-4, 'WATER_GENERATOR'],
    [-3, 'DC_DC_CHARGER'],
    [-2, 'AC_CHARGER'],
    [-1, 'GENERIC_SOURCE'],
    [1, 'GENERIC_LOAD'],
    [2, 'ELECTRIC_DRIVE'],
    [3, 'FRIDGE'],
    [4, 'WATER_PUMP'],
    [5, 'BILGE_PUMP'],
    [6, 'DC_SYSTEM'],
    [7, 'INVERTER'],
    [8, 'WATER_HEATER']
]);

class VictronDCEnergyMeter extends _Victron{
    
    static async identify(device){

        try{
            const isVictron = (super.identify(device)!=null)
            if (!isVictron) return null
            
            if (await this.getMode(device)==0x0D)
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
                this.addMetadatum('starterVoltage','V',  'starter battery voltage', 
                        (buff,offset=0)=>{return buff.readInt16LE(offset)/100})
                        break;

            case AuxMode.TEMPERATURE:
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
                (buff)=>{return buff.readInt16LE(0)})
        this.addMetadatum('voltage','','voltage',
                (buff)=>{return buff.readInt16LE(2)/100})
        this.addMetadatum('alarm','', 'alarm', 
                (buff)=>{return buff.readUInt16LE(4)})
        this.addMetadatum('current','A', 'current')    
    }
    emitValuesFrom(decData){
        this.emitData("meterType",decData,0)
        this.emitData("voltage",decData,2);
        const alarm = this.getMetadata().get("alarm").read(decData,4)
        if (alarm>0){
            this.emit(
                `ALARM #${alarm} from ${this.getDisplayName()})`, 
                { message: AlarmReason(alarm), state: 'alert'})
        }
        switch(this.auxMode){
            case this.constructor.AuxMode.STARTER_VOLTAGE:
                this.emitData("starterVoltage",decData,6);
                break;
            case this.constructor.AuxMode.TEMPERATURE:
                this.emitData("temperature",decData,6);
                break;
            default:
                break
            }      
        this.emit("current", this.getAuxModeAndCurrent(8,decData).current)
  
    }
    

}
module.exports=VictronDCEnergyMeter 