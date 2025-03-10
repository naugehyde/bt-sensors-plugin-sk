const BTSensor = require("../BTSensor");

class IBeacon extends BTSensor {
    static isSystem = true;

    static async identify(device) {
        const md = await this.getDeviceProp(device,'ManufacturerData');
        if (md){
            if (md[0x004c].value[0] == 0x02 && md[0x004c].value[1] == 0x15){
                return this;
            } 
        return null;
        }
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
}

module.exports = IBeacon;
