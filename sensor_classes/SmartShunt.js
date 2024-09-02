const BTSensor = require("../BTSensor");

class SmartShunt extends BTSensor{
    constructor(device){
        super(device)
    }
    static metadata = new Map()
    .set('current',{unit:'A', description: 'house battery amperage'})
    .set('power',{unit:'W', description: 'house battery wattage'})
    .set('voltage',{unit:'V', description: 'house battery voltage'})
    .set('starterVoltage',{unit:'V', description: 'starter battery voltage'})
    .set('consumed',{unit:'', description: 'amp-hours consumed'})
    .set('soc',{unit:'', description: 'state of charge'})    
    .set('ttg',{unit:'s', description: 'time to go'})    
connect() {
        //TBD: Implement AES-Ctr decryption of ManufacturerData per https://github.com/keshavdv/victron-ble
        const cb = async (propertiesChanged) => {

            this.device.getManufacturerData().then((data)=>{
                //TBD get shunt data and emit
                this.emit("voltage", 14.0);

            }
            )
        }
        cb();
        device.helper.on('PropertiesChanged', cb)
    }
    
}
module.exports=SmartShunt