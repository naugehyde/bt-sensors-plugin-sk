const BTSensor = require("../BTSensor");

class Inkbird extends BTSensor{

    static async identify(device){
        try{
            const uuids = await this.getDeviceProp(device,'UUIDs')
            const name = await this.getDeviceProp(device,"Name")
            if ((name == 'tps' || name=='sps') && (uuids.length > 0 && uuids[0] == '0000fff0-0000-1000-8000-00805f9b34fb')){
                return this
            }
        } catch (e){
            this.debug(e)
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
        await super.init()
        if (this.getName() == 'sps'){
            this.addMetadatum('humidity','ratio', 'humidity')
        }
    }

   async propertiesChanged(props){
        super.propertiesChanged(props)    
        if (props.ManufacturerData) {
            const keys = Object.keys(this.currentProperties.ManufacturerData) 
            const key = keys[keys.length-1]
            const data = this.getManufacturerData(key)
            if (!data)
                throw new Error("Unable to get manufacturer data for "+this.getDisplayName())
            this.emit("temp", (parseInt(key)/100) + 273.1);
            this.emit('battery', data[5]/100)
            if (this.getMetadata().has('humidity')){
                this.emit("temp", data.readUInt16LE(0)/100);
            }
        }
   }                         
}
module.exports=Inkbird