const BTSensor = require("../BTSensor");

class SmartShunt extends BTSensor{
    constructor(device){
        super(device)
    }
    static data = new Map()
                    .set('current',{unit:'A', description: 'Current temperature'})
                    .set('power',{unit:'W', description: 'Current humidity'})
                    .set('voltage',{unit:'V', description: 'The sensor\'s battery voltage'})
                    .set('starterVoltage',{unit:'V', description: 'The sensor\'s battery voltage'})
                    .set('consumed',{unit:'', description: 'The sensor\'s battery voltage'})
                    .set('soc',{unit:'', description: 'State of Charge'})    
                    .set('ttg',{unit:'s', description: 'Time to go'})    
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