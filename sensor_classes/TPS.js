const BTSensor = require("../BTSensor");

class TPS extends BTSensor{

    constructor(device){
        super(device)
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

    callback () {
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
        //TBD figure out what the heck this device is actually broadcasting
        //For now it appears the current temp is in the key of the data but there are multiple keys
        //(async ()=>{ 
            //const c= await this.constructor.identify(this.device)
             //const c = await this.device.getUUIDs()//helper.prop('UUIDs')
             //console.log( c )
        //})()
        this.cb = async (propertiesChanged) => {
            try {
                const md = await this.device.getProp('ManufacturerData')
                if (!md){
                    return
                }
                const keys = Object.keys(md) 
                this.emit("temp", (parseInt(keys[keys.length-1])/100) + 273.1);
                
            }
            catch (error) {
                throw new Error(`Unable to read data}: ${error.message}` )
            }
        }
        this.cb();
        this.device.helper.on('PropertiesChanged', this.cb)
        return this
    }
    async disconnect(){
        super.disconnect()
        if (this.cb)
            this.device.helper.removeListener('PropertiesChanged',this.cb)
    }
}
module.exports=TPS