const BTSensor = require("../BTSensor");
class BLACKLISTED extends BTSensor {
    static isSystem = true;
    static async identify(device) {
        const md = await this.getDeviceProp(device, "ManufacturerData");
        const addrType  = await this.getDeviceProp(device, "AddressType");
        const addr = await this.getDeviceProp(device, "Address")
        const addrFirstByte = addr?parseInt((addr)[0]):0
         if (addrType=="random" && addrFirstByte >= 4 && addrFirstByte<=7) {
            return this
        }
        
        if (md && Object.hasOwn(md, 0x004c)){
            if (md[0x004c].value.slice(0,2).join() != [0x02, 0x15].join()){ // iBeacons are exempt
                return this;
            }

        return null;
        }
    }

    async init() {
        await super.init();
        this.currentProperties.Name = `Unsupported device from ${this.getManufacturer()}`;
    }

    initListen(){
        //do nothing
    }
    reasonForBlacklisting() {
        switch (this.getManufacturerID()) {
            case 0x004c:
                return "Randomized MAC address (Apple)";
     
            default:
                return "Random Private Address";
        }
    }
}
module.exports = BLACKLISTED;
