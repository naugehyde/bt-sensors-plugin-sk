const BTSensor = require("../../BTSensor");
class AranetSensor extends BTSensor{
    
    constructor(device, config={}){
        super(device, config)
    }

    static async identify(device){
        const md  = await this.getDeviceProp(device,"ManufacturerData")
        if (md && md.length && md[0]==0x0702) {
            return this
        }
        
        return null
    }
  
}
module.exports=AranetSensor