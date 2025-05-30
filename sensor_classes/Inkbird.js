const BTSensor = require("../BTSensor");

class Inkbird extends BTSensor{

    static async  identify(device){

        const uuids = await this.getDeviceProp(device,'UUIDs')
        const name = await this.getDeviceProp(device,"Name")
        if ((name == 'tps' || name=='sps') && (uuids.length > 0 && uuids[0] == '0000fff0-0000-1000-8000-00805f9b34fb'))
            return  this
        else
            return null
        
    }

    async init(){
        await super.init()
        this.addMetadatum('temp','K', 'temperature')
        this.addMetadatum('battery','ratio', 'battery strength')
        if (this.getName() == 'sps'){
            this.addMetadatum('humidity','ratio', 'humidity')
        }
    }

    getManufacturer(){
        return "Shenzhen Inkbird Technology Co."
    }
    async propertiesChanged(props){
        super.propertiesChanged(props)    
        
        if (props.ManufacturerData) {
            const keys = Object.keys(this.currentProperties.ManufacturerData) 
            const key = keys[keys.length-1]
            const data = this.getManufacturerData(key)
            const key_i = parseInt(key)
            if (!data)
                throw new Error("Unable to get manufacturer data for "+this.getDisplayName())
            this.emit("temp", parseFloat((273.15+(key_i & 0x8000 ? key_i - 0x10000 : key_i)/100).toFixed(2))) ;
            this.emit('battery', data[5]/100)
            if (this.getMetadata().has('humidity')){
                this.emit("humidity", data.readUInt16LE(0)/100);
            }
        }
   }                         
}
module.exports=Inkbird