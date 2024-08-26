const BTSensor = require("../BTSensor");

class HQ2204C2GHD extends BTSensor{
    constructor(device){
        super(device)
    }
    connect() {
        const cb = async (propertiesChanged) => {

            this.device.getManufacturerData().then((data)=>{
            
                this.eventEmitter.emit("house_voltage", 14.0);

            }
            )
        }
        cb();
        device.helper.on('PropertiesChanged', cb)
    }
    
}
module.exports=HQ2204C2GHD