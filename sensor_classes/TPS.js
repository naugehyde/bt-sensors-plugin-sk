const BTSensor = require("../BTSensor");

class TPS extends BTSensor{

    constructor(device){
        super(device)
    }
    static data = new Map()
                    .set('temp',{unit:'K', description: 'Current temperature'})
    connect() {
        //TBD figure out what the heck this device is actually broadcasting
        //For now it appears the current temp is in the key of the data but there are multiple keys
        const cb = (propertiesChanged) => {
            try {
                this.device.getManufacturerData().then((data)=>{                 
                    this.emit("temp", (parseInt(Object.keys(data)[0])/100) + 273.1);
                })
            }
            catch (error) {
                throw new Error(`Unable to read data from ${util.inspect(device)}: ${error}` )
            }
        }
        cb();
        this.device.helper.on('PropertiesChanged', cb)
    }
}
module.exports=TPS