const BTSensor = require("../BTSensor");
function decodeTempHumid(tempHumidBytes) {
    // Convert the bytes to a 24-bit integer
    const baseNum = (tempHumidBytes[0] << 16) + (tempHumidBytes[1] << 8) + tempHumidBytes[2];
  
    // Check if the temperature is negative
    const isNegative = (baseNum & 0x800000) !== 0;
  
    // Extract the temperature and humidity values
    const tempAsInt = baseNum & 0x7FFFFF;
    const tempAsFloat = (tempAsInt / 1000) / 10.0;
    const humid = (tempAsInt % 1000) / 10.0;
  
    // Apply the negative sign if necessary
    if (isNegative) {
      return {t:-tempAsFloat, h: humid};
    } else {
      return {t: tempAsFloat, h: humid};
    }
  }
class GoveeH510x extends BTSensor{
    static Domain = this.SensorDomains.environmental
    static async  identify(device){
        const regex = /^GVH510[0-9]_[a-f,A-F,0-9]{4}$/
        const name = await this.getDeviceProp(device,"Name")
        const uuids = await this.getDeviceProp(device,'UUIDs')

        if (name && name.match(regex) && 
            uuids && uuids.length > 0 && 
            uuids[0] == '0000ec88-0000-1000-8000-00805f9b34fb')
            return this
        else
            return null
        
    }

    initSchema(){
        super.initSchema()
        this.addDefaultParam("zone")

        this.addDefaultPath("temp","environment.temperature")
        this.addDefaultPath("humidity", "environment.humidity")
        this.addDefaultPath("battery","sensors.batteryStrength")        
    }

    emitValuesFrom(buffer){
        const th = decodeTempHumid(buffer.subarray(2,5))
        this.emit("temp", parseFloat((273.15+th.t).toFixed(2))) ;
        this.emit("humidity", th.h/100 )
        this.emit('battery', buffer[5]/100)
    }

    getManufacturer(){
        return "Govee"
    }
    async propertiesChanged(props){
        super.propertiesChanged(props)    
        if (!props.hasOwnProperty("ManufacturerData")) return

        const buffer = this.getManufacturerData(0x0001)
        if (buffer) {
            this.emitValuesFrom(buffer)
        }      
   }                         
}
module.exports=GoveeH510x
