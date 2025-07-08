const BTSensor = require("../../BTSensor");

class GoveeSensor extends  BTSensor {
    static Domain = this.SensorDomains.environmental
    static ManufacturerUUID = '0000ec88-0000-1000-8000-00805f9b34fb'
    static async  identify(device){
        
        const regex = /^Govee_H5075_[a-f,A-F,0-9]{4}$/
        const name = await this.getDeviceProp(device,"Name")
        const uuids = await this.getDeviceProp(device,'UUIDs')
 
        if (name && name.match(this.getIDRegex()) && 
            uuids && uuids.length > 0 && 
            uuids[0] == this.ManufacturerUUID)
            return this
        else
            return null
        
    }

    static DATA_ID=0xec88
    getManufacturer(){
        return "Govee"
    }
    getPackedTempAndHumidity(buffer, beg )
    {
        const negative=buffer[beg]&0x80
        return {
            packedValue: ((buffer.readIntBE(beg,3))&0xFFFFFF) ^ (negative?0x800000:0x000000),
            tempIsNegative: negative
        }
    }
    emitTemperatureAndHumidity(packedValue, tempIsNegative ){
        this.emit("temp", 273.15+((((Math.trunc(packedValue/1000))/10))*(tempIsNegative?-1:1)))
        this.emit("humidity", (packedValue % 1000) / 1000)

    }
    async propertiesChanged(props){
        super.propertiesChanged(props)    
        if (!props.hasOwnProperty("ManufacturerData")) return

        const buffer = this.getManufacturerData(this.constructor.DATA_ID)
        if (buffer) {
            this.emitValuesFrom(buffer)
        }      
   }                         
}
module.exports=GoveeSensor
