const BTSensor = require("../BTSensor");

class TPS extends BTSensor{

    constructor(device){
        super(device)
    }

    connect() {
        //TBD figure out what the heck this device is actually broadcasting
        //For now it appears the current temp is in the key of the data but there are multiple keys
        const cb = async (propertiesChanged) => {
            this.device.getManufacturerData().then((data)=>{                 
                this.eventEmitter.emit("temp", (parseInt(Object.keys(data)[0])/100) + 273.1);
            })
        }
        cb();
        this.device.helper.on('PropertiesChanged', cb)
    }
}
module.exports=TPS