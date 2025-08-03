const BTSensor = require("../BTSensor");
class UNKNOWN extends BTSensor{
    static isSystem = true

    static identify(device){
        return null
    }
    async init(){
        await super.init()
        if (!this.currentProperties.Name) 
            this.currentProperties.Name= `Unknown device from ${this.getManufacturer()}`
        this.addParameter(
            "sensorClass",
            {
                title: "Sensor Class",
                enum: Array.from(this.constructor.classMap.keys()),
                enumNames: (Array.from(this.constructor.classMap.values()).map((cls)=>{return cls.DisplayName()}))
            }
        )
        this.listen()

    }


}
module.exports=UNKNOWN