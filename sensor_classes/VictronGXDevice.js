const VictronDevice = require ("./Victron/VictronDevice.js") 
const VC = require("./Victron/VictronConstants.js")
const int24 = require('int24')
class VictronGXDevice extends VictronDevice{
/*
Record layout is still to be determined and might change.
Start
bit
Nr of
bits Meaning Units Range NA value Remark
0 0 32 16 Battery voltage 0.01 V 0 .. 655.34
V
0xFFFF VE_REG_DC_CHANNEL1_VOLTAGE
2 16 48 20 PV power W 0 .. 1 MW 0xFFFFF VE_REG_DC_INPUT_POWER
4 36 68 7 SOC 1% 0 .. 100% 0x7F VE_REG_SOC
5 43 75 21 Battery power W -1 .. 1 MW 0x0FFFFF VE_REG_DC_CHANNEL1_POWER
96 21 DC power W -1 .. 1 MW 0x0FFFFF
TBD - AC in power
TBD - AC out power
TBD - Warnings /
Alarms
TBD
117 43 Unuse
*/
    static async identify(device){
        return await this.identifyMode(device, 0x07)
    }   

    static {
        this.metadata = new Map(super.getMetadata())
        this.addMetadatum('voltage','V', 'channel #1 voltage', 
            (buff)=>{return buff.readInt16LE(0)/100})
        this.addMetadatum('pvPower','W','DC input power in watts', 
            (buff)=>{
                return int24.readInt24BE(buff,2)>>4
            })
        this.addMetadatum('soc','ratio', 'state of charge', 
            (buff)=>{ 
                return ((buff.readUInt16BE(4)&0xfff)>>5)/100
            })
        this.addMetadatum('batteryPower','W', 'battery power', 
            (buff)=>{
                    return (int24.readInt24BE(buff,5)&0x1ffff)
            })    
        this.addMetadatum('DCPower','W', 'DCpower', 
            (buff)=>{
                return int24.readInt24BE(buff,8)>>3
            })    
        }
}
module.exports=VictronGXDevice