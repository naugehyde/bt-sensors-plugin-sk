/*
SmartLithium (0x05)
Start Bit	Nr of Bits	Meaning	Units	Range	NA Value	Remark
32	32	BMS flags		0..0xFFFFFFFF		VE_REG_BMS_FLAGs
64	16	SmartLithium error		0..0xFFFF		VE_REG_SMART_LITHIUM_ERROR_FLAGS
80	7	Cell 1	0.01V	2.60..3.86 V	0x7F	VE_REG_BATTERY_CELL_VOLTAGE*
87	7	Cell 2	0.01V	2.60..3.86 V	0x7F	VE_REG_BATTERY_CELL_VOLTAGE*
94	7	Cell 3	0.01V	2.60..3.86 V	0x7F	VE_REG_BATTERY_CELL_VOLTAGE*
101	7	Cell 4	0.01V	2.60..3.86 V	0x7F	VE_REG_BATTERY_CELL_VOLTAGE*
108	7	Cell 5	0.01V	2.60..3.86 V	0x7F	VE_REG_BATTERY_CELL_VOLTAGE*
115	7	Cell 6	0.01V	2.60..3.86 V	0x7F	VE_REG_BATTERY_CELL_VOLTAGE*
122	7	Cell 7	0.01V	2.60..3.86 V	0x7F	VE_REG_BATTERY_CELL_VOLTAGE*
129	7	Cell 8	0.01V	2.60..3.86 V	0x7F	VE_REG_BATTERY_CELL_VOLTAGE*
136	12	Battery voltage	0.01V	0..40.94 V	0x0FFF	VE_REG_DC_CHANNEL1_VOLTAGE
148	4	Balancer status		0..15	0x0F	VE_REG_BALANCER_STATUS
152	7	Battery temperature	1°C	-40..86 °C	0x7F	VE_REG_BAT_TEMPERATURE Temperature = Record value - 40
159	1	Unused				
VE_REG_BATTERY_CELL_VOLTAGE 0x00 ( 0) when cell voltage < 2.61V 0x01 ( 1) when cell voltage == 2.61V 0x7D (125) when cell voltage == 3.85V 0x7E (126) when cell voltage > 3.85 0x7F (127) when cell voltage is not available / unknown
*/

const VictronSensor = require ("./Victron/VictronSensor") 
const VC = require("./Victron/VictronConstants")
const BitReader = require("./_BitReader")

const BALANCERSTATUS = {
    0:"Unknown",
    1:"Balanced",
    2:"Balancing",
    3:"Cell imbalance",
    0xF:"Not applicable"
}
function _toCellVoltage(val){    
    return val==0x7F?NaN:2.6+(val/100)
}
class VictronSmartLithium extends VictronSensor{

  
    initSchema(){
        super.initSchema()
        this.addDefaultParam("batteryID")

        this.addMetadatum('bmsFlags','', 'BMS Flags', 
                        (buff)=>{return buff.readUInt32LE(0)})
        .default="electrical.batteries.{batteryID}.flags"

        this.addMetadatum('smartLithiumErrors','', 'Smart Lithium Errors Flags',
            (buff)=>{return buff.readUInt16LE(4)})
            .default="electrical.batteries.{batteryID}.errors"

        for (let i=0;i<8; i++){
            this.addMetadatum(`cell${i+1}Voltage`,'V', `cell ${i+1} voltage`)
            .default=`electrical.batteries.{batteryID}.cell${i+1}.voltage`
        }
        this.addDefaultPath('batteryVoltage','electrical.batteries.voltage')
            .read=(buff)=>{return this.NaNif((buff.readUInt16LE(13)&0xFFF),0xFFF)/100}

        this.addMetadatum('balancerStatus','', 'balancer status', 
            (buff)=>{return BALANCERSTATUS[this.NaNif((buff.readUInt8(14)>>4),0xF)]})
            .default=`electrical.batteries.{batteryID}.balancerStatus`

        this.addDefaultPath('batteryTemp','electrical.batteries.temperature') 
            .read=(buff)=>{return this.NaNif((buff.readUInt8(15)&0x7F),0x7F)+233.15}          
    }
    emitValuesFrom(buffer){
        super.emitValuesFrom(buffer)
        const br = new BitReader(buffer.subarray(6,13))
        for (let i = 0; i<8; i++)
            this.emit(`cell${i+1}Voltage`,_toCellVoltage(br.read_unsigned_int(7)))
    }
}
module.exports=VictronSmartLithium
