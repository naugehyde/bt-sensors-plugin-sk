const BTSensor = require("../../BTSensor");
class AranetSensor extends BTSensor{
    COLOR = {
        1: 'Green',
        2: 'Yellow',
        3: 'Red'
    }
    
    constructor(device, config={}){
        super(device, config)
    }

    static async identify(device){
        const md  = await this.getDeviceProp(device,"ManufacturerData")
    
        if (md && md[0x0702]) {
            return this
        }
        
        return null
    }
    initSchema(){
        super.initSchema()
        this.addDefaultParam("zone")
    }
  
}
module.exports=AranetSensor