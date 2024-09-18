const BTSensor = require("../BTSensor");
const LYWSD03MMC = require('./LYWSD03MMC.js')
class ATC extends BTSensor{

    constructor(device,params){
        super(device,params)
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
            return null
        }
        return null
    }
  
    static {
        this.metadata = new Map( LYWSD03MMC.getMetadata())
        this.addMetadatum('humidity','ratio', 'humidity',
            (buff,offset)=>{return ((buff.readInt16LE(offset))/10000)})
    }

    async connect() {
        this.cb = (propertiesChanged) => {
            try{
                this.device.getServiceData().then((data)=>{             
                    //TBD Check if the service ID is universal across ATC variants
                    const buff=data['0000181a-0000-1000-8000-00805f9b34fb'];
                    this.emitData("temp", buff, 6)
                    this.emitData("humidity", buff, 8)
                    this.emitData("voltage", buff, 10)
                })
            }
            catch (error) {
                throw new Error(`Unable to read data from ${util.inspect(device)}: ${error}` )
            }
        }
        this.cb()
        this.device.helper.on('PropertiesChanged', this.cb)
        return this
    }
    async disconnect(){
        super.disconnect()
        if (this.cb)
            this.device.helper.removeListener('PropertiesChanged',this.cb)
    }
}
module.exports=ATC