const BTSensor = require("../BTSensor");

class IBeacon extends BTSensor {
    static isSystem = true;

    static async identify(device) {
        /*const md = await this.getDeviceProp(device,'ManufacturerData');
        if (md && Object.hasOwn(md, 0x004c)) {
            if (md[0x004c].value.slice(0,2).join() == [0x02, 0x15].join()) {
            return this
            }
        }*/
       // IBeacon protocol (see above) is incorporated into multiple BT devices
       // The identify:: method above will misidentify any sensor (Govee for example)
       // that the scanner finds.
       // Sensors can still be classified as IBeacons, they'll appear as Unknown devices in 
       // the config. Users can then select IBeacon from the dropdown to
       // instantiate the sensor as an IBeacon object.
       
    return null
    }

    async init() {
        await super.init();
        this.initMetadata();
    }

    initMetadata(){
        this.addMetadatum('battery','ratio', 'Battery charge state', (buffer)=>{return buffer[6]})
    }

    propertiesChanged(props){
        super.propertiesChanged(props);
        const buff = this.getServiceData("0000356e-0000-1000-8000-00805f9b34fb");
        if (!buff)
            throw new Error("Unable to get service data for " + this.getDisplayName());
        this.emitData("battery", buff);
    }

    getManufacturer(){
        return "Apple Inc. or clone";
    }

    getDescription(){
        return `${this.getName()} iBeacon from Apple Inc. or a clone`
    }
}

module.exports = IBeacon;
