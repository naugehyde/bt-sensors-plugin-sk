const BTSensor = require("../BTSensor");
class BLACKLISTED extends BTSensor{
    static isSystem = true
    static async identify(device){
        if (await this.getManufacturerID(device)===0x004C)   //apple devices use 
            return this                                     //randomised macs and clog up our list
        else
            return null
    }
    async init(){
        await super.init()
        this.currentProperties.Name= `Unsupported device from ${this.getManufacturer()}`
    }
    reasonForBlacklisting() {
        switch ( this.getManufacturerID()){
            case (0x004C): return "Randomized MAC address"
            case (0x02e1): return "Device is using VE.Smart" //NOTE: Victron/VictronSensor class 
                                                             //determines if a device is using VE.Smart
                                                             //in identify(). If so, identify() returns
                                                             //BlackListedDevice
        
            default: return ""
            
        }

    }
}
module.exports=BLACKLISTED