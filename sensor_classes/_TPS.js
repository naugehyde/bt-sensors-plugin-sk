const BTSensor = require("../BTSensor");

class TPS extends BTSensor{

    constructor(device, params){
        super(device,params)
    }

    static async identify(device){
        try{
            const uuids = await device.helper.prop('UUIDs')
            if (await device.getNameSafe() == 'tps' || await device.getAliasSafe() == 'tps' || 
            (uuids.length > 0 && uuids[0] == '0000fff0-0000-1000-8000-00805f9b34fb')){
                return this
            }
        } catch (e){
            console.log(e)
            return null
        }
        return null
    }

    static metadata = new Map()
                    .set('temp',{unit:'K', description: 'temperature'})

    async callback (propertiesChanged) {
        try {
            //console.log(propertiesChanged)
            //if (this.constructor.name==='TPS'){
            console.log(`TPS / ${this.constructor.name}`)
            
            this.device.getManufacturerData().then((md)=>{
                if (!(md===undefined)) {
                    const keys = Object.keys(md) 
                    this.emit("temp", (parseInt(keys[keys.length-1])/100) + 273.1);
                }
            })//}
        }
        catch (error) {
            throw new Error(`Unable to read data: ${error}` )
        }
    }
                            
    async connect() {
        this.callback();
        this.device.helper.on('PropertiesChanged', this.callback())
        return this
    }
    async disconnect(){
        super.disconnect()
        if (this.cb)
            this.device.helper.removeListener('PropertiesChanged',this.cb)
    }
}
module.exports=TPS