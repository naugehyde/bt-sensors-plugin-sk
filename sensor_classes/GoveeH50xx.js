const BTSensor = require("../BTSensor");

class GoveeH50xx extends  BTSensor {

    static async  identify(device){
        const regex = /^Govee_H50[0-9]{2}_[a-f,A-F,0-9]{4}$/
        //this.getManufacturer()
        const name = await this.getDeviceProp(device,"Name")
        const uuids = await this.getDeviceProp(device,'UUIDs')
 
        if (name && name.match(regex) && 
            uuids && uuids.length > 0 && 
            uuids[0] == '0000ec88-0000-1000-8000-00805f9b34fb')
            return this
        else
            return null
        t
    }

    initSchema(){
        super.initSchema()
        this.addDefaultParam("zone")

        this.addDefaultPath("temp","environment.temperature")
            .read= (buffer)=>{return 273.15+(buffer.readUInt16LE(1)/100) }
        
        this.addDefaultPath("humidity", "environment.humidity")
            .read = (buffer)=>{return buffer.readUInt16LE(3)/10000}   

        this.addDefaultPath("battery","sensors.batteryStrength")   
            .read = (buffer)=>{return buffer.readUInt8(5)/100}
    }

    getManufacturer(){
        return "Govee"
    }
    async propertiesChanged(props){
        super.propertiesChanged(props)    
        if (!props.hasOwnProperty("ManufacturerData")) return

        const buffer = this.getManufacturerData(0xec88)
        if (buffer) {
            this.emitValuesFrom(buffer)
        }      
   }                         
}
module.exports=GoveeH50xx
