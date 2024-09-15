const BTSensor = require("../BTSensor");
const crypto = require('node:crypto');


AlarmReason={
    LOW_VOLTAGE: 1,
    HIGH_VOLTAGE : 2,
    LOW_SOC :4,
    LOW_STARTER_VOLTAGE : 8,
    HIGH_STARTER_VOLTAGE : 16,
    LOW_TEMPERATURE : 32,
    HIGH_TEMPERATURE : 64,
    MID_VOLTAGE : 128,
    OVERLOAD : 256,
    DC_RIPPLE : 512,
    LOW_V_AC_OUT : 1024,
    HIGH_V_AC_OUT : 2048,
    SHORT_CIRCUIT : 4096,
    BMS_LOCKOUT : 8192
}
MODEL_ID_MAP = {
    0x203: "BMV-700",
    0x204: "BMV-702",
    0x205: "BMV-700H",
    0x0300: "BlueSolar MPPT 70|15",
    0xA040: "BlueSolar MPPT 75|50",
    0xA041: "BlueSolar MPPT 150|35",
    0xA042: "BlueSolar MPPT 75|15",
    0xA043: "BlueSolar MPPT 100|15",
    0xA044: "BlueSolar MPPT 100|30",
    0xA045: "BlueSolar MPPT 100|50",
    0xA046: "BlueSolar MPPT 150|70",
    0xA047: "BlueSolar MPPT 150|100",
    0xA049: "BlueSolar MPPT 100|50 rev2",
    0xA04A: "BlueSolar MPPT 100|30 rev2",
    0xA04B: "BlueSolar MPPT 150|35 rev2",
    0xA04C: "BlueSolar MPPT 75|10",
    0xA04D: "BlueSolar MPPT 150|45",
    0xA04E: "BlueSolar MPPT 150|60",
    0xA04F: "BlueSolar MPPT 150|85",
    0xA050: "SmartSolar MPPT 250|100",
    0xA051: "SmartSolar MPPT 150|100",
    0xA052: "SmartSolar MPPT 150|85",
    0xA053: "SmartSolar MPPT 75|15",
    0xA054: "SmartSolar MPPT 75|10",
    0xA055: "SmartSolar MPPT 100|15",
    0xA056: "SmartSolar MPPT 100|30",
    0xA057: "SmartSolar MPPT 100|50",
    0xA058: "SmartSolar MPPT 150|35",
    0xA059: "SmartSolar MPPT 150|100 rev2",
    0xA05A: "SmartSolar MPPT 150|85 rev2",
    0xA05B: "SmartSolar MPPT 250|70",
    0xA05C: "SmartSolar MPPT 250|85",
    0xA05D: "SmartSolar MPPT 250|60",
    0xA05E: "SmartSolar MPPT 250|45",
    0xA05F: "SmartSolar MPPT 100|20",
    0xA060: "SmartSolar MPPT 100|20 48V",
    0xA061: "SmartSolar MPPT 150|45",
    0xA062: "SmartSolar MPPT 150|60",
    0xA063: "SmartSolar MPPT 150|70",
    0xA064: "SmartSolar MPPT 250|85 rev2",
    0xA065: "SmartSolar MPPT 250|100 rev2",
    0xA066: "BlueSolar MPPT 100|20",
    0xA067: "BlueSolar MPPT 100|20 48V",
    0xA068: "SmartSolar MPPT 250|60 rev2",
    0xA069: "SmartSolar MPPT 250|70 rev2",
    0xA06A: "SmartSolar MPPT 150|45 rev2",
    0xA06B: "SmartSolar MPPT 150|60 rev2",
    0xA06C: "SmartSolar MPPT 150|70 rev2",
    0xA06D: "SmartSolar MPPT 150|85 rev3",
    0xA06E: "SmartSolar MPPT 150|100 rev3",
    0xA06F: "BlueSolar MPPT 150|45 rev2",
    0xA070: "BlueSolar MPPT 150|60 rev2",
    0xA071: "BlueSolar MPPT 150|70 rev2",
    0xA102: "SmartSolar MPPT VE.Can 150/70",
    0xA103: "SmartSolar MPPT VE.Can 150/45",
    0xA104: "SmartSolar MPPT VE.Can 150/60",
    0xA105: "SmartSolar MPPT VE.Can 150/85",
    0xA106: "SmartSolar MPPT VE.Can 150/100",
    0xA107: "SmartSolar MPPT VE.Can 250/45",
    0xA108: "SmartSolar MPPT VE.Can 250/60",
    0xA109: "SmartSolar MPPT VE.Can 250/70",
    0xA10A: "SmartSolar MPPT VE.Can 250/85",
    0xA10B: "SmartSolar MPPT VE.Can 250/100",
    0xA10C: "SmartSolar MPPT VE.Can 150/70 rev2",
    0xA10D: "SmartSolar MPPT VE.Can 150/85 rev2",
    0xA10E: "SmartSolar MPPT VE.Can 150/100 rev2",
    0xA10F: "BlueSolar MPPT VE.Can 150/100",
    0xA112: "BlueSolar MPPT VE.Can 250/70",
    0xA113: "BlueSolar MPPT VE.Can 250/100",
    0xA114: "SmartSolar MPPT VE.Can 250/70 rev2",
    0xA115: "SmartSolar MPPT VE.Can 250/100 rev2",
    0xA116: "SmartSolar MPPT VE.Can 250/85 rev2",
    0xA201: "Phoenix Inverter 12V 250VA 230V",
    0xA202: "Phoenix Inverter 24V 250VA 230V",
    0xA204: "Phoenix Inverter 48V 250VA 230V",
    0xA211: "Phoenix Inverter 12V 375VA 230V",
    0xA212: "Phoenix Inverter 24V 375VA 230V",
    0xA214: "Phoenix Inverter 48V 375VA 230V",
    0xA221: "Phoenix Inverter 12V 500VA 230V",
    0xA222: "Phoenix Inverter 24V 500VA 230V",
    0xA224: "Phoenix Inverter 48V 500VA 230V",
    0xA231: "Phoenix Inverter 12V 250VA 230V",
    0xA232: "Phoenix Inverter 24V 250VA 230V",
    0xA234: "Phoenix Inverter 48V 250VA 230V",
    0xA239: "Phoenix Inverter 12V 250VA 120V",
    0xA23A: "Phoenix Inverter 24V 250VA 120V",
    0xA23C: "Phoenix Inverter 48V 250VA 120V",
    0xA241: "Phoenix Inverter 12V 375VA 230V",
    0xA242: "Phoenix Inverter 24V 375VA 230V",
    0xA244: "Phoenix Inverter 48V 375VA 230V",
    0xA249: "Phoenix Inverter 12V 375VA 120V",
    0xA24A: "Phoenix Inverter 24V 375VA 120V",
    0xA24C: "Phoenix Inverter 48V 375VA 120V",
    0xA251: "Phoenix Inverter 12V 500VA 230V",
    0xA252: "Phoenix Inverter 24V 500VA 230V",
    0xA254: "Phoenix Inverter 48V 500VA 230V",
    0xA259: "Phoenix Inverter 12V 500VA 120V",
    0xA25A: "Phoenix Inverter 24V 500VA 120V",
    0xA25C: "Phoenix Inverter 48V 500VA 120V",
    0xA261: "Phoenix Inverter 12V 800VA 230V",
    0xA262: "Phoenix Inverter 24V 800VA 230V",
    0xA264: "Phoenix Inverter 48V 800VA 230V",
    0xA269: "Phoenix Inverter 12V 800VA 120V",
    0xA26A: "Phoenix Inverter 24V 800VA 120V",
    0xA26C: "Phoenix Inverter 48V 800VA 120V",
    0xA271: "Phoenix Inverter 12V 1200VA 230V",
    0xA272: "Phoenix Inverter 24V 1200VA 230V",
    0xA274: "Phoenix Inverter 48V 1200VA 230V",
    0xA279: "Phoenix Inverter 12V 1200VA 120V",
    0xA27A: "Phoenix Inverter 24V 1200VA 120V",
    0xA27C: "Phoenix Inverter 48V 1200VA 120V",
    0xA281: "Phoenix Inverter 12V 1600VA 230V",
    0xA282: "Phoenix Inverter 24V 1600VA 230V",
    0xA284: "Phoenix Inverter 48V 1600VA 230V",
    0xA291: "Phoenix Inverter 12V 2000VA 230V",
    0xA292: "Phoenix Inverter 24V 2000VA 230V",
    0xA294: "Phoenix Inverter 48V 2000VA 230V",
    0xA2A1: "Phoenix Inverter 12V 3000VA 230V",
    0xA2A2: "Phoenix Inverter 24V 3000VA 230V",
    0xA2A4: "Phoenix Inverter 48V 3000VA 230V",
    0xA340: "Phoenix Smart IP43 Charger 12|50 (1+1)",
    0xA341: "Phoenix Smart IP43 Charger 12|50 (3)",
    0xA342: "Phoenix Smart IP43 Charger 24|25 (1+1)",
    0xA343: "Phoenix Smart IP43 Charger 24|25 (3)",
    0xA344: "Phoenix Smart IP43 Charger 12|30 (1+1)",
    0xA345: "Phoenix Smart IP43 Charger 12|30 (3)",
    0xA346: "Phoenix Smart IP43 Charger 24|16 (1+1)",
    0xA347: "Phoenix Smart IP43 Charger 24|16 (3)",
    0xA381: "BMV-712 Smart",
    0xA382: "BMV-710H Smart",
    0xA383: "BMV-712 Smart Rev2",
    0xA389: "SmartShunt 500A/50mV",
    0xA38A: "SmartShunt 1000A/50mV",
    0xA38B: "SmartShunt 2000A/50mV",
    0xA3A4: "Smart Battery Sense",
    0xA3A5: "Smart Battery Sense",
    0xA3C0: "Orion Smart 12V|12V-18A Isolated DC-DC Charger",
    0xA3C8: "Orion Smart 12V|12V-30A Isolated DC-DC Charger",
    0xA3D0: "Orion Smart 12V|12V-30A Non-isolated DC-DC Charger",
    0xA3C1: "Orion Smart 12V|24V-10A Isolated DC-DC Charger",
    0xA3C9: "Orion Smart 12V|24V-15A Isolated DC-DC Charger",
    0xA3D1: "Orion Smart 12V|24V-15A Non-isolated DC-DC Charger",
    0xA3C2: "Orion Smart 24V|12V-20A Isolated DC-DC Charger",
    0xA3CA: "Orion Smart 24V|12V-30A Isolated DC-DC Charger",
    0xA3D2: "Orion Smart 24V|12V-30A Non-isolated DC-DC Charger",
    0xA3C3: "Orion Smart 24V|24V-12A Isolated DC-DC Charger",
    0xA3CB: "Orion Smart 24V|24V-17A Isolated DC-DC Charger",
    0xA3D3: "Orion Smart 24V|24V-17A Non-isolated DC-DC Charger",
    0xA3C4: "Orion Smart 24V|48V-6A Isolated DC-DC Charger",
    0xA3CC: "Orion Smart 24V|48V-8.5A Isolated DC-DC Charger",
    0xA3C5: "Orion Smart 48V|12V-20A Isolated DC-DC Charger",
    0xA3CD: "Orion Smart 48V|12V-30A Isolated DC-DC Charger",
    0xA3C6: "Orion Smart 48V|24V-12A Isolated DC-DC Charger",
    0xA3CE: "Orion Smart 48V|24V-16A Isolated DC-DC Charger",
    0xA3C7: "Orion Smart 48V|48V-6A Isolated DC-DC Charger",
    0xA3CF: "Orion Smart 48V|48V-8.5A Isolated DC-DC Charger",
    0xA3E6: "Lynx Smart BMS 1000",
    0x2780: "Victron Multiplus II 12/3000/120-50 2x120V",
    0xC030: "SmartShunt IP65 500A/50mV",
}

class _Victron extends BTSensor{

    constructor(device,params){
        super(device,params)
        this.advertisementKey = params?.advertisementKey
    }

    static async identify(device){
        try{
           
            const md = await device.getProp('ManufacturerData')
            if (!md) return null   
            const data = md[0x2e1]
            if (data && data.value[0]==0x10)
                return this

        } catch (e){
            console.log(e)
            return null
        }
        return null
    }    
 
    static metadata = new Map()
        .set('advertisementKey',{description: "Advertisement Key", isParam: true})
    
    async init(){
        super.init()
    }
    decrypt(data){
        const encMethod = 'aes-128-ctr';
        const iv = data.readUInt16LE(5); 
        const key = Buffer.from(this.advertisementKey,'hex')
        const ivBuffer = Buffer.alloc(16); // 128 bits = 16 bytes
        
        ivBuffer.writeUInt16LE(iv)
        
        var encData = Buffer.from([...data.slice(8)])
        
        const decipher = crypto.createDecipheriv(encMethod, key, ivBuffer)
        
        const decData=decipher.update(encData)

        return decData
        
    }
    
    async connect() {
        if (this.advertisementKey){
            this.cb = (propertiesChanged) => {
                try{
                    this.device.getManufacturerData().then((data)=>{             
                        const buff=data[0x2e1];
                        const decData=this.decrypt(buff)
                        this.emitValuesFrom(decData)
                    })
                }
                catch (error) {
                    throw new Error(`Unable to read data from ${util.inspect(device)}: ${error}` )
                }
            }
            this.cb()
            this.device.helper.on('PropertiesChanged', this.cb)
            return this
        }
        else return this.gatt_connect()
    }
    gatt_connect(){
        throw new Error( "GATT Connection unimplemented")
    }
}
module.exports=_Victron