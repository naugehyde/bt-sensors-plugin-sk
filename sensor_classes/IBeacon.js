const BTSensor = require("../BTSensor");

class IBeacon extends BTSensor {
    static isSystem = true;

    static async identify(device) {
        const md = await this.getDeviceProp(device,'ManufacturerData');
        if (md){
            const buffer = new ArrayBuffer(23);
            const md_array = new Uint8Array(buffer);
            md_array.set(md[0x004c]);
            if (md_array.slice(0,2) == 0x0215){
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
        this.addMetadatum('battery','ratio', 'Battery Strength', (buffer)=>{return buffer[6]})
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
