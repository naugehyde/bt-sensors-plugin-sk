const BTSensor = require("../BTSensor");
const _Victron = require("./_Victron");

class VictronSolarCharger extends _Victron{
    constructor(device,params){
        super(device,params)
        this.advertisementKey = params?.advertisementKey
    }
    static async identify(device){

        try{
            const isVictron = (super.identify(device)!=null)
            if (!isVictron) return null
            
            const md = await device.getProp('ManufacturerData')
            if (!md) return null   
            const data = md[0x2e1]
            if (data && data.value.readUInt8(4)==0x01)
                return this

        } catch (e){
            console.log(e)
            return null
        }
        return null
    }
    static metadata = new Map(super.metadata.entries())
                    .set('chargeState',{unit:'', description: 'charge state', 
                        read: (buff)=>{return buff.readUInt8(0)}})
                   .set('chargeError',{unit:'', description: 'charge error',
                        read: (buff)=>{return buff.readUInt8(1)}})
                    .set('voltage',{unit:'V', description: 'charger battery voltage', 
                        read: (buff)=>{return buff.readInt16LE(2)/100}})
                    .set('current',{unit:'A', description: 'charger battery current', 
                        read: (buff)=>{return buff.readInt16LE(4)/10}})
                    .set('yield',{unit:'Wh', description: 'yield today', 
                        read: (buff)=>{return buff.readUInt16LE(6)*10}})
                    .set('solarPower',{unit:'W', description: 'solar power', 
                        read: (buff)=>{return buff.readUInt16LE(8)}})    
                    .set('externalDeviceLoad',{unit:'s', description: 'external device load', 
                        read: (buff)=>{return buff.readUInt16LE(10)}})    

/*
     "charge_state" / Int8ul,
        "charger_error" / Int8ul,
        # Battery voltage reading in 0.01V increments
        "battery_voltage" / Int16sl,
        # Battery charging Current reading in 0.1A increments
        "battery_charging_current" / Int16sl,
        # Todays solar power yield in 10Wh increments
        "yield_today" / Int16ul,
        # Current power from solar in 1W increments
        "solar_power" / Int16ul,
        # External device load in 0.1A increments
        "external_device_load" / Int16ul,
    )

    def parse_decrypted(self, decrypted: bytes) -> dict:
        pkt = self.PACKET.parse(decrypted)

        return {
            "charge_state": OperationMode(pkt.charge_state),
            "battery_voltage": pkt.battery_voltage / 100,
            "battery_charging_current": pkt.battery_charging_current / 10,
            "yield_today": pkt.yield_today * 10,
            "solar_power": pkt.solar_power,
            "external_device_load": 0
            if pkt.external_device_load == 0x1FF
            else pkt.external_device_load,
        }

*/

    emitValuesFrom(decData){
        this.getMetadata().forEach((datum, tag)=>{
                this.emit(tag, datum.read(decData))
        })
    }
    

}
module.exports=VictronSolarCharger 