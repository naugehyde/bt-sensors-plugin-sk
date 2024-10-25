/*
Smart Battery Protect
Start
bit
Nr of
bits Meaning Units Range NA
value Remark
8 8 Device state 0 .. 0xFE 0xFF VE_REG_DEVICE_STATE
16 8 Output state 0 .. 0xFE 0xFF VE_REG_DC_OUTPUT_STATUS
24 8 Error code 0 .. 0xFE 0xFF VE_REG_CHR_ERROR_CODE
32 16 Alarm reason 0 .. 0xFFFF - VE_REG_ALARM_REASON
48 16 Warning reason 0 .. 0xFFFF - VE_REG_WARNING_REASON
64 16 Input voltage 0.01 V 327.68 .. 327.66 V 0x7FFF VE_REG_DC_CHANNEL1_VOLTAGE
80 16 Output voltage 0.01 V 0 .. 655.34 V 0xFFFF VE_REG_DC_OUTPUT_VOLTAGE
96 32 Off reason 0 .. 0xFFFFFFFF - VE_REG_DEVICE_OFF_REASON_2
*/

const VictronSensor = require ("./Victron/VictronSensor.js") 
const VC = require("./Victron/VictronConstants.js")
class VictronSmartBatteryProtect extends VictronSensor{

    static async identify(device){
        return await this.identifyMode(device, 0x09)
    }   

    async init() {
        await super.init()
        this.initMetadata()
    }
    initMetadata(){
        this.addMetadatum('deviceState','', 'device state', 
                        (buff)=>{return VC.OperationMode.get(buff.readUInt8(1))})
        this.addMetadatum('outputStatus','', 'output status', //TODO
            (buff)=>{return (buff.readUInt8(2))})

        this.addMetadatum('chargerError','', 'charger error',
            (buff)=>{return VC.ChargerError.get(buff.readUInt8(3))})
        this.addMetadatum('alarmReason','', 'alarm reason', 
            (buff)=>{return VC.AlarmReason.get(buff.readUInt16LE(4))})
        this.addMetadatum('warningReason','', 'warning reason', //TODO
            (buff)=>{return (buff.readUInt16LE(5))})
        this.addMetadatum('channel1Voltage','V', 'channel one voltage', 
            (buff)=>{return this.NaNif(buff.readInt16LE(7),0x7FFF)/100})
        this.addMetadatum('outputVoltage','V', 'output voltage', 
            (buff)=>{return this.NaNif(buff.readUInt16LE(9),0xFFFF)/100})
        this.addMetadatum('offReason','', 'off reason', 
            (buff)=>{return VC.OffReasons.get(buff.readUInt16LE(11))}) //TODO
        }

}
module.exports=VictronSmartBatteryProtect 