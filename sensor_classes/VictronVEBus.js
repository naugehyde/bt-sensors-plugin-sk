const VictronSensor = require ("./Victron/VictronSensor.js") 
const VC = require("./Victron/VictronConstants.js")
const BitReader = require("./_BitReader")
AC_IN_STATE=["AC in 1","AC in 2","NOT CONNECTED", "NA"]
ALARM_STATE=["None","warning", "alarm","NA"]
class VictronVEBus extends VictronSensor{


    initSchema(){
        super.initSchema()
        this.addMetadatum('chargeState','', 'charge state', 
            (buff)=>{return VC.OperationMode.get(buff.readUInt8(0))})
            
        this.addMetadatum('veBusError','', 'VE bus error',
            (buff)=>{return buff.readUInt8(1)}) //TODO
        
        this.addMetadatum('current','A','charger battery current', 
            (buff)=>{return this.NaNif(buff.readInt16LE(2),0x7FFF)/10})
        
        this.addMetadatum('voltage','V', 'charger battery voltage')
         
        this.addMetadatum('acInState','', 'AC in state')
        
        this.addMetadatum('acInPower','W','AC power IN in watts')
        
        this.addMetadatum('acOutPower','W','AC power OUT in watts')
        
        this.addMetadatum('alarm','','alarm state 0=no alarm, 1=warning, 2=alarm')
        
        this.addMetadatum('batteryTemperature','K', 'battery temperature')    

        this.addMetadatum('soc', 'ratio', 'state of charge')    
            
    }
    emitValuesFrom(buffer){
        super.emitValuesFrom(buffer)
        const br = new BitReader(buffer.subarray(4))
        this.emit('voltage',
            this.NaNif(br.read_unsigned_int(14),0x3FFF)/100)
         
        this.emit('acInState',
            AC_IN_STATE[br.read_unsigned_int(2)])
        
        this.emit('acInPower',
            this.NaNif(br.read_signed_int(19),0x3FFFF))
        
        this.emit('acOutPower',
            this.NaNif(br.read_signed_int(19),0x3FFFF))
        
        this.emit('alarm', ALARM_STATE[br.read_unsigned_int(2)])
        
        this.emit('batteryTemperature',
            this.NaNif((br.read_unsigned_int(7),0x7F))+233.15)  

        this.emit('soc', 
            this.NaNif((br.read_unsigned_int(7),0x7F))/100)
 
    }
}
module.exports=VictronVEBus