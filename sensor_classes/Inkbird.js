const BTSensor = require("../BTSensor");

class Inkbird extends BTSensor{

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
            if (await device.getNameSafe() == 'sps' || await device.getAliasSafe() == 'sps' || 
            (uuids.length > 0 && uuids[0] == '0000fff0-0000-1000-8000-00805f9b34fb')){ //confirm uuid
                return this
            }
        } catch (e){
            console.log(e)
            return null
        }
        return null
    }

    static {
        this.metadata = new Map(super.getMetadata())
        this.addMetadatum('temp','K', 'temperature')
        this.addMetadatum('battery','ratio', 'battery strength')
    }

    async init(){
        if (await this.device.getNameSafe() == 'sps'){
            this.addMetadatum('humidity','ratio', 'humidity')
        }
    }

    callback () {
        try {            
            this.device.getManufacturerData().then((md)=>{
                if (!(md===undefined)) {
                    const keys = Object.keys(md) 
                    const key = keys[keys.length-1]
                    const data = md[keys[keys.length-1]]
                    this.emit("temp", (parseInt(key)/100) + 273.1);
                    this.emit('battery', data[5]/100)
                    if (this.getMetadata().has('humidity')){
                        this.emit("temp", data.readUInt16LE(0)/100);
                    }
                }
            })
        }
        catch (error) {
            throw new Error(`Unable to read data: ${error}` )
        }
    }
                            
    async connect() {
        this.callback();
        this.device.helper.on('PropertiesChanged', this.callback)
        return this
    }

    async disconnect(){
        super.disconnect()
        if (this.cb)
            this.device.helper.removeListener('PropertiesChanged',this.cb)
    }
}
module.exports=Inkbird