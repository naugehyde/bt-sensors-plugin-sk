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

const VictronDevice = require ("./Victron/VictronDevice.js") 
const VC = require("./Victron/VictronConstants.js")
class VictronSmartBatteryProtect extends VictronDevice{

    static async identify(device){
        return await this.identifyMode(device, 0x09)
    }   

    static {
        this.metadata = new Map(super.getMetadata())

        this.addMetadatum('deviceState','', 'device state', 
                        (buff)=>{return VC.OperationMode.get(buff.readUInt8(0))})
        this.addMetadatum('outputStatus','', 'output status', 
            (buff)=>{return (buff.readUInt8(1))})

        this.addMetadatum('chargerError','', 'charger error',
            (buff)=>{return VC.ChargerError.get(buff.readUInt8(2))})
        this.addMetadatum('alarmReason','', 'alarm reason', 
            (buff)=>{return VC.AlarmReason(buff.readUInt16LE(2))})
        this.addMetadatum('warningReason','', 'warning reason', 
            (buff)=>{return (buff.readUInt16LE(4))})
        this.addMetadatum('channel1Voltage','V', 'channel one voltage', 
            (buff)=>{return buff.readInt16LE(6)/100})
        this.addMetadatum('outputVoltage','V', 'output voltage', 
            (buff)=>{return buff.readUInt16LE(8)/100})
        this.addMetadatum('offReason','', 'off reason', 
            (buff)=>{return VC.OffReasons(buff.readUInt16LE(10))})
        }

        async connect() {
            //ASSUMING there's no decrypt here. 
            this.cb = async (propertiesChanged) => {
                try{
                    const data = 
                    await this.device.getManufacturerData()             
                    const buff=data[0x2e1];
                    this.emitValuesFrom(buff)
                }
                catch (error) {
                    throw new Error(`Unable to read data from ${await this.getDisplayName()}: ${error}` )
                }
            }
            this.cb()
            this.device.helper.on('PropertiesChanged', this.cb)
            return this
        }

}
module.exports=VictronSmartBatteryProtect 