const VictronDevice = require ("./Victron/VictronDevice.js") 
const VC = require("./Victron/VictronConstants.js")
const int24 = require('int24')
AC_IN_STATE=["AC in 1","AC in 2","NOT CONNECTED", "NA"]
ALARM_STATE=["None","warning", "alarm","NA"]
class VictronVEBus extends VictronDevice{

    static async identify(device){
        return await this.identifyMode(device, 0x0C)
    }   

    static {
        this.metadata = new Map(super.getMetadata())

        this.addMetadatum('chargeState','', 'charge state', 
            (buff)=>{return VC.OperationMode.get(buff.readUInt8(0))})
            
        this.addMetadatum('veBusError','', 'VE bus error',
            (buff)=>{return buff.readUInt8(1)}) //TODO
        
        this.addMetadatum('current','A','charger battery current', 
            (buff)=>{return this.NaNif(buff.readInt16LE(2),0x7FFF)/10})
        
        this.addMetadatum('voltage','V', 'charger battery voltage',
            (buff)=>{return this.NaNif(buff.readUInt16LE(4) & 0x3FFF,0x3FFF)/100})
         
        this.addMetadatum('acInState','', 'AC in state', 
            (buff)=>{return AC_IN_STATE[readUInt8(5)>>6]})
        
        this.addMetadatum('acInPower','W','AC power IN in watts',  
            (buff)=>{return this.NaNif(int24.readInt24LE(buff,6)>>5,0x3FFFF)*(raw & 0x40000)?-1:1})
        
        this.addMetadatum('acOutPower','W','AC power OUT in watts',  
            (buff)=>{return this.NaNif((int24.readInt24LE(buff,8) & 0x1FFFF) >> 2,0x3FFFF) * (raw & 0b1)?-1:1})
        
        this.addMetadatum('alarm','','alarm state 0=no alarm, 1=warning, 2=alarm',  
            (buff)=>{return ALARM_STATE[buff.readUInt8(10)&0x3] })
        
        this.addMetadatum('batteryTemperature','K', 'battery temperature', 
            (buff)=>{return this.NaNif((buff.readInt8(10)&0x1FF)>>1,0x7F) +233.15})    

        this.addMetadatum('soc', 'ratio', 'state of charge',
            (buff)=>{return this.NaNif((buff.readInt16BE(10)&0x1FF)>>2,0x7F)/100})    
            
    }
}
module.exports=VictronVEBus