const BTSensor = require("../BTSensor");
const Aranet4 = require("Aranet/Aranet4")
const Aranet2 = require("Aranet/Aranet2")
class Aranet extends BTSensor{
    
    constructor(device, config={}){
        super(device, config)
    }

    static async identify(device){
        const md  = this.getDeviceProp(device,"ManufacturerData")
        const name = await this.getDeviceProp(device,"Name")
        if (md && md.length && md[0]==0x0702) {
            if (name.startsWith("ARANET4")) {
                return Aranet4
            }
            if (name.startsWith("ARANET2")) {
                return Aranet2
            }
        }
        
        return null
    }
  
}
module.exports=AranetSensor