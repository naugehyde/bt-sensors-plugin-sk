/*(Lynx Smart) BMS (0x0A)
Start Bit	Nr of Bits	Meaning	Units	Range	NA Value	Remark
32	8	Error	0x0	VE_REG_BMS_ERROR		
40	16	TTG	1min	0..45.5 days	0xFFFF	VE_REG_TTG
56	16	Battery voltage	0.01V	-327.68..327.66 V	0x7FFF	VE_REG_DC_CHANNEL1_VOLTAGE
72	16	Battery current	0.1A	-3276.8..3276.6	0x7FFF	VE_REG_DC_CHANNEL1_CURRENT
88	16	IO status			0x0	VE_REG_BMS_IO
104	18	Warnings/Alarms			0x0	VE_REG_BMS_WARNINGS_ALARMS
122	10	SOC	0.1%	0..100.0%	0x3FF	VE_REG_SOC
132	20	Consumed Ah	0.1Ah	-104,857..0 Ah	0xFFFFF	VE_REG_CAH Consumed Ah = -Record value
152	7	Temperature	°C	-40..86 °C	0x7F	VE_REG_BAT_TEMPERATURE Temperature = Record value - 40
159	1	Unused*/



const VictronDevice = require ("./Victron/VictronDevice.js") 
const VC = require("./Victron/VictronConstants.js")
const int24 = require('int24')

class VictronLynxSmartBMS extends VictronDevice{

    static async identify(device){
        return await this.identifyMode(device, 0x0A)
    }   

    static {
        this.metadata = new Map(super.getMetadata())

        this.addMetadatum('error','', 'error code', 
            (buff)=>{return buff.readUInt8(0)})
 
        this.addMetadatum('ttg','s', 'time to go (in seconds)',
            (buff)=>{return buff.readInt16LE(1)*60})
        this.addMetadatum('voltage','V', 'channel 1 voltage',
            (buff)=>{return buff.readInt16LE(3)/100})
        this.addMetadatum('current','A','channel 1 current', 
            (buff)=>{return buff.readInt16LE(5)/10})
        this.addMetadatum('ioStatus','','IO Status', 
            (buff)=>{return buff.readInt16LE(7)})
        this.addMetadatum('warningsAndAlarms','','warnings and alarms',
            (buff)=>{return (int24.readUInt24BE(buff,9)>>6)})
        this.addMetadatum('soc','','state of charge',
            (buff)=>{return ((buff.readUInt16BE(11)&0x3fff)>>4)/100})
        this.addMetadatum('consumedAh','Ah','amp-hours consumed',
            (buff)=>{return (int24.readUInt24BE(12)>>4)/10} )
        this.addMetadatum('temp', 'K', 'battery temperature',
            (buff)=>{return ((buff.readUInt8(15)>>1)-40)+273.15})
    }
}
module.exports=VictronLynxSmartBMS