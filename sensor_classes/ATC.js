const BTSensor = require("../BTSensor");
const LYWSD03MMC = require('./LYWSD03MMC.js')
class ATC extends BTSensor{

    constructor(device){
        super(device)
    }
    static async identify(device){
        try{
            const regex = /^ATC_[A-Fa-f0-9]{6}$/
            const name = await device.getNameSafe()
            const alias = await device.getAliasSafe()
            if (name.match(regex) || (alias).match(regex)){
                return this
            }
        } catch (e){
//            console.log(e)
            return null
        }
        return null
    }
    static metadata = LYWSD03MMC.metadata
    
    connect() {
        const cb = async (propertiesChanged) => {
            try{
                this.device.getServiceData().then((data)=>{             
                    //TBD Check if the service ID is universal across ATC variants
                    const buff=data['0000181a-0000-1000-8000-00805f9b34fb'];
                    this.emit("temp",((buff.readInt16LE(6))/100) + 273.1);
                    this.emit("humidity",buff.readUInt16LE(8)/10000);
                    this.emit("voltage",buff.readUInt16LE(10)/1000);
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
module.exports=ATC