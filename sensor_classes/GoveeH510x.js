const GoveeSensor = require("./Govee/GoveeSensor");

class GoveeH510x extends GoveeSensor{
    
    static getIDRegex(){
        return /^GVH510[0-9]_[a-f,A-F,0-9]{4}$/
    }

     static test(){
        const sensor = new GoveeH510x()
        sensor.getName=()=>{return "Govee H510x fake"}
        sensor.initSchema()
        sensor.on("temp", (t)=>{console.log(`temp => ${t}`)})
        sensor.on("humidity", (t)=>{console.log(`humidity => ${t}`)})
        sensor.on("battery", (t)=>{console.log(`battery => ${t}`)})
        sensor.emitValuesFrom(Buffer.from([0x01,0x01,0x03,0x6d,0xcc,0x5c]))

    }
    static DATA_ID = 0x0001
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
        const val = this.getPackedTempAndHumidity(buffer,2)
        this.emitTemperatureAndHumidity(val.packedValue, val.tempIsNegative)
        this.emit("battery", buffer[5]/100)

    }

                     
}
module.exports=GoveeH510x
