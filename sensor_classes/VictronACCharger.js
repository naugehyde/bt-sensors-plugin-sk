/*AC Charger
Record layout is still to be determined and might change.
Last update: 2022/12/14 13:25 rend:ble:extra_manufacturer_data https://wiki.victronenergy.com/rend/ble/extra_manufacturer_data
https://wiki.victronenergy.com/ Printed on 2022/12/14 13:27
Startbit Nr of bits Meaning Units Range NA value Remark
32 8 Device state 0 .. 0xFE 0xFF VE_REG_DEVICE_STATE
40 8 Charger Error 0 .. 0xFE 0xFF VE_REG_CHR_ERROR_CODE
48 13 Battery voltage 1 0.01 V 0 .. 81.90V 0x1FFF VE_REG_DC_CHANNEL1_VOLTAGE
61 11 Battery current 1 0.1A 0 .. 204.6A 0x7FF VE_REG_DC_CHANNEL1_CURRENT
72 13 Battery voltage 2 0.01 V 0 .. 81.90V 0x1FFF VE_REG_DC_CHANNEL2_VOLTAGE
85 11 Battery current 2 0.1A 0 .. 204.6A 0x7FF VE_REG_DC_CHANNEL2_CURRENT
96 13 Battery voltage 3 0.01 V 0 .. 81.90V 0x1FFF VE_REG_DC_CHANNEL3_VOLTAGE
109 11 Battery current 3 0.1A 0 .. 204.6A 0x7FF VE_REG_DC_CHANNEL3_CURRENT
120 7 Temperature °C -40 .. 86°C 0x7F VE_REG_BAT_TEMPERATURE Temperature = Record value - 40
127 9 AC current 0.1A 0 .. 51.0 A 0x1FF VE_REG_AC_ACTIVE_INPUT_L1_CURRENT
136 24 Unused
*/



const VictronSensor = require ("./Victron/VictronSensor.js") 
const VC = require("./Victron/VictronConstants.js")
const BitReader = require("./_BitReader")

class VictronACCharger extends VictronSensor{

    static async identify(device){
        return await this.identifyMode(device, 0x08)
    }   


    initSchema(){
        super.initSchema()

        this.addMetadatum('state','', 'device state', 
            (buff)=>{return VC.OperationMode.get(buff.readUInt8(0))})

        this.addMetadatum('chargerError','', 'charger error code', 
            (buff)=>{return VC.ChargerError.get(buff.readUInt8(1))})
 
        this.addMetadatum('batt1','V', 'battery 1 voltage')

        this.addMetadatum('curr1','A', 'battery 1 current')

        this.addMetadatum('batt2','V', 'battery 2 voltage')

        this.addMetadatum('curr2','A', 'battery 2 current')

        this.addMetadatum('batt3','V', 'battery 3 voltage')

        this.addMetadatum('curr3','A', 'battery 3 current')
    
        this.addMetadatum('temp', 'K', 'battery temperature')

        this.addMetadatum('acCurr','A', 'AC current')
    }
    emitValuesFrom(buffer){
        super.emitValuesFrom(buffer)
        
        const br = new BitReader(buffer.subarray(2))
        this.emit("batt1",  this.NaNif(br.read_unsigned_int(13),0x1FFF)/100)
        this.emit("curr1", this.NaNif(br.read_unsigned_int(11),0x7FF)/10)

        this.emit("batt2",  this.NaNif(br.read_unsigned_int(13),0x1FFF)/100)
        this.emit("curr2", this.NaNif(br.read_unsigned_int(11),0x7FF)/10)

        this.emit("batt3",  this.NaNif(br.read_unsigned_int(13),0x1FFF)/100)
        this.emit("curr3", this.NaNif(br.read_unsigned_int(11),0x7FF)/10)
        this.emit("temp", this.NaNif(br.read_unsigned_int(7),0x7F)+233.15)
        this.emit("acCurr", this.NaNif(br.read_unsigned_int(9),0x1FF)/100)
    }
}
module.exports=VictronACCharger
