const BTSensor = require("../BTSensor");

class SmartShunt extends BTSensor{
    constructor(device){
        super(device)
    }
    connect() {
        //TBD: Implement AES-Ctr decryption of ManufacturerData per https://github.com/keshavdv/victron-ble
        const cb = async (propertiesChanged) => {

            this.device.getManufacturerData().then((data)=>{
                //TBD get shunt data and emit
                this.eventEmitter.emit("voltage", 14.0);

            }
            )
        }
        cb();
        device.helper.on('PropertiesChanged', cb)
    }
    
}
module.exports=SmartShunt