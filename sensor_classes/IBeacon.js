const BTSensor = require("../BTSensor");

class IBeacon extends BTSensor {
    static isSystem = true;

    static async identify(device) {
        const md = await this.getDeviceProp(device,'ManufacturerData');
        if (md && Object.hasOwn(md, 0x004c)) {
            if (md[0x004c].value.slice(0,2).join() == [0x02, 0x15].join()) {
            return this
            }
        }
    return null
    }

    initSchema(){
        super.initSchema()
        this.addDefaultPath("battery","sensors.batteryStrength")   
        .read=(buffer)=>{return buffer[6]}
    }

    propertiesChanged(props){
        super.propertiesChanged(props);
        const buff = this.getServiceData("0000356e-0000-1000-8000-00805f9b34fb");
        if (buff) 
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
