const BTSensor = require("../BTSensor");
class UNKNOWN extends BTSensor{
    static identify(device){
        return null
    }
    async init(){
        await super.init()
        if (!this.currentProperties.Name) 
            this.currentProperties.Name= `Unknown device from ${this.getManufacturer()}`
    }
}
module.exports=UNKNOWN