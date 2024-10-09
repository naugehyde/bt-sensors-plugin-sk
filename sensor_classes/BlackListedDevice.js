const BTSensor = require("../BTSensor");
class BLACKLISTED extends BTSensor{
    static async identify(device){
        if (await this.getManufacturerID(device)===0x004C)   //apple devices use 
            return this                                     //randomised macs and clog up our list
        return null
    }
    async init(){
        await super.init()
        this.currentProperties.Name= `Unsupported device from ${this.getManufacturer()}`
    }
    reasonForBlacklisting() {
        switch ( this.getManufacturerID()){
            case (0x004C): return "Randomized MAC address"
            default: return ""
        }

    }
}
module.exports=BLACKLISTED