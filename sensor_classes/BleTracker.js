const BTSensor = require("../BTSensor");
class BleTracker extends BTSensor {
    static isSystem = true;

    static async identify(device) {
        const appearance = await this.getDeviceProp(device, "Appearance");
        if (appearance == 0x0240) {
            return this;
        }
        return null;
    }
    async init() {
        await super.init();
        this.currentProperties.Name = `Tracking: ${this.getManufacturer()}, ${this.getName()}, ${this.getDisplayName()}`;
        // var md =this.addMetadatum("bleTracker",'db',"BLE Tracker")
        // md.isParam=true
        // md.enum=Array.from(this.constructor.classMap.keys())
        // md.enumNames=this.constructor.classMap
    }
}
module.exports = BleTracker;
