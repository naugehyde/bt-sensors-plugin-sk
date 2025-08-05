const GoveeSensor = require("./Govee/GoveeSensor");

class GoveeH5075 extends  GoveeSensor {
    static getIDRegex(){
        return /^Govee_H5075_[a-f,A-F,0-9]{4}$/
    }
    static test(){
        const sensor = new GoveeH5075()
        sensor.getName=()=>{return "Govee H5075 fake"}
        sensor.initSchema()
        sensor.on("temp", (t)=>{console.log(`temp => ${t}`)})
        sensor.on("humidity", (t)=>{console.log(`humidity => ${t}`)})
        sensor.on("battery", (t)=>{console.log(`battery => ${t}`)})
        sensor.emitValuesFrom(Buffer.from([0x00, 0x81, 0xc2 ,0x89 ,0x64 ,0x00]))
        sensor.emitValuesFrom(Buffer.from([0x00,0x03,0xbb,0x94,0x64,0x00]))

    }
    static ImageFile = "GoveeH5075.webp"

    initSchema(){
        super.initSchema()
        this.addDefaultParam("zone")

        this.addDefaultPath("temp","environment.temperature")
        this.addDefaultPath("humidity", "environment.humidity")
        this.addDefaultPath("battery","sensors.batteryStrength")   
    }

    emitValuesFrom(buffer){
        if (buffer.length<6) {
            this.debug(`Invalid buffer received. Cannot parse buffer ${buffer} for ${this.getMacAndName()}`)
            return
        }
        const val = this.getPackedTempAndHumidity(buffer,1)
        this.emitTemperatureAndHumidity(val.packedValue, val.tempIsNegative)
        this.emit("battery", buffer[4]/100)
    }                         
}
module.exports=GoveeH5075
