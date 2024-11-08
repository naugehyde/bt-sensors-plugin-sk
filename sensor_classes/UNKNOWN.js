const BTSensor = require("../BTSensor");
class UNKNOWN extends BTSensor{
    static identify(device){
        return null
    }
    async init(){
        await super.init()
        if (!this.currentProperties.Name) 
            this.currentProperties.Name= `Unknown device from ${this.getManufacturer()}`
        var md =this.addMetadatum("sensorClass",'',"Sensor Class")
        md.isParam=true
        md.enum=Array.from(this.constructor.classMap.keys())
        //md.enumNames=this.constructor.classMap

    }


}
module.exports=UNKNOWN