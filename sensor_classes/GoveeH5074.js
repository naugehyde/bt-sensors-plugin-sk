const GoveeSensor = require("./Govee/GoveeSensor");

class GoveeH5074 extends  GoveeSensor {
    static getIDRegex() {
        return /^Govee_H5074_[a-f,A-F,0-9]{4}$/
    }
    static ImageFile = "GoveeH5074.jpg"

    initSchema(){
        super.initSchema()
        this.addDefaultParam("zone")

        this.addDefaultPath("temp","environment.temperature")
            .read= (buffer)=>{return 273.15+(buffer.readInt16LE(1)/100) }
        
        this.addDefaultPath("humidity", "environment.humidity")
            .read = (buffer)=>{return buffer.readUInt16LE(3)/10000}   

        this.addDefaultPath("battery","sensors.batteryStrength")   
            .read = (buffer)=>{return buffer.readUInt8(5)/100}
    }

        
}
module.exports=GoveeH5074
