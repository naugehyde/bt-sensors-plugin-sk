const BTSensor = require("../BTSensor");
class BLACKLISTED extends BTSensor {
    static isSystem = true;
    static async identify(device) {
        const md = await this.getDeviceProp(device, "ManufacturerData");
        if (md) {
            const keys = Object.keys(md);
            if (keys.length == 1 && keys[0] == 0x004c) {
                if (md[0x004c].value[0] != 0x02 && md[0x004c].value[1] != 0x15){ // iBeacons are exempt
                    return this;
                }
            }
        return null;
        }
    }

    async init() {
        await super.init();
        this.currentProperties.Name = `Unsupported device from ${this.getManufacturer()}`;
    }
    reasonForBlacklisting() {
        switch (this.getManufacturerID()) {
            case 0x004c:
                return "Randomized MAC address (Apple)";
            case 0x02e1:
                return "Device is using VE.Smart"; //NOTE: Victron/VictronSensor class
            //determines if a device is using VE.Smart
            //in identify(). If so, identify() returns
            //BlackListedDevice

            default:
                return "";
        }
    }
}
module.exports = BLACKLISTED;
