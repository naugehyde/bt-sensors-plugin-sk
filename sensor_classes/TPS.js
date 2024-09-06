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
    connect() {
        //TBD figure out what the heck this device is actually broadcasting
        //For now it appears the current temp is in the key of the data but there are multiple keys
        //(async ()=>{ 
            //const c= await this.constructor.identify(this.device)
             //const c = await this.device.getUUIDs()//helper.prop('UUIDs')
             //console.log( c )
        //})()
        const cb = (propertiesChanged) => {
            try {
                this.device.getManufacturerData().then(async (data)=>{                
                    const keys = Object.keys(data) 
                    //console.log(await this.device.helper.props())
                    this.emit("temp", (parseInt(keys[keys.length-1])/100) + 273.1);
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