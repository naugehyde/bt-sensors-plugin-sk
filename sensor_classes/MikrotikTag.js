// support for Mikrotik TG-BT5-OUT Beacon/Sensor (in native Mikrotik mode)
// TG-BT5-OUT can also be configured to run in Eddystone or iBeacon mode)
// but this modules support the default Mikrotik mode
// to get a name, use the configuration APP to enable name advertisment on the sensors
const BTSensor = require("../BTSensor");

class MikrotikTag extends BTSensor{
    static manufacturerID = 0x094F
    static Domain = BTSensor.SensorDomains.environmental
    static ImageFile = "Mikrotik-TG-BT5-OUT.png"
    static  async identify(device){
        if (await this.getManufacturerID(device)==this.manufacturerID)
            return this
        else
            return null
    }    
        
    initSchema(){
        super.initSchema()
        this.addDefaultParam("zone")

        const md = this.valueIfVariant(this.getManufacturerData(this.constructor.manufacturerID))

        if (md) {
            this.mode = md[0]
            if (this['_initModeV'+this.mode])
                this['_initModeV'+this.mode]()
            else
                throw new Error("Unrecognized Mikrotik PDU version "+md[0])
        }
    } 

    // Protocol Docs https://help.mikrotik.com/docs/spaces/UM/pages/105742533/MikroTik+Tag+advertisement+formats
    // "AdvData" field structure (max 31 octets/bytes):
    // Of L Descr        Value
    // 00 1 Flags Length (02)
    // 01 1 Flags Type   (01)
    // 02 1 Flags Data   (06)
    // 03 1 Length       (15)
    // 04 1 Type         (FF) 
    // 05 2 CompanyID    (4F09)
    //{"type":"Buffer","data":[1,0,63,229,255,255,0,0,255,255,48,14,213,75,146,5,0,100]}
    // 07 1 Version      (01) -- currently only version 1 products  ==> OFFSET 0 in ManufacturerData
    // 08 1 UserData     (xx)  00 => not encrypted, 01 => encrypted
    // Secrect-Field is used for payload, multibyte values always in little endian
    // 09 2 Salt         (xxxx) used as checksum for payload, if the same in two message, data is unchanged
    // 11 2 X-Accel      (xxxx) m/s2 (*256)
    // 13 2 Y-Accel      (xxxx) m/s2 (*256)
    // 15 2 Z-Accel      (xxxx) m/s2 (*256)
    // 17 2 Temperature  (xxxx) C * 256
    // 19 4 Uptime       (xxxxxxxx) seconds
    // 23 1 Flags        (1:FLAG_REED_SWITCH,2:FLAG_ACCEL_TILT,3:FLAG_ACCEL_FREE_FALL,4:FLAG_IMPACT_X,5:FLAG_IMPACT_X,6:FLAG_IMPACT_Z,7:FLAG_ACCEL_DISABLED)
    // 24 1 Battery      (xx) Percentage

    _initModeV1(){
        this.addDefaultPath("temp","environment.temperature") 
            .read=(buffer)=>{ return parseFloat((273.15+buffer.readInt16LE(10)/256.0).toFixed(3))}

        this.addMetadatum("accX","m/s2","acceleration on X-axis", 
            (buffer)=>{ return parseFloat((buffer.readInt16LE(4)/256.0).toFixed(3)) }
        ).examples=["sensors.{macAndName}.accX"]
        
        this.addMetadatum("accY","m/s2","acceleration on Y-axis", 
            (buffer)=>{ return parseFloat((buffer.readInt16LE(6)/256.0).toFixed(3)) }
        ).examples=["sensors.{macAndName}.accY"]
        
        this.addMetadatum("accZ","m/s2","acceleration on Z-axis", 
            (buffer)=>{ return parseFloat((buffer.readInt16LE(8)/256.0).toFixed(3)) }
        ).examples=["sensors.{macAndName}.accZ"]

        this.addDefaultPath("battery","sensors.batteryStrength")
            .read=(buffer)=>{ return parseFloat((buffer[17]/100.0).toFixed(3)) }
    }

    propertiesChanged(props){
        super.propertiesChanged(props)
        if (props.ManufacturerData)
            this.emitValuesFrom( this.getManufacturerData(this.constructor.manufacturerID) )
    }

}
module.exports=MikrotikTag
