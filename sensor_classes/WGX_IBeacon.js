const BTSensor = require("../BTSensor");

class WGX_IBeacon extends BTSensor {
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
        return "WUHANXINXUSHENGDIANZISHANGWUYOUXIAN GONGSI";
    }
}

module.exports = WGX_IBeacon;
