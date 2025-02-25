const BTSensor = require("../BTSensor");
class BleTracker extends BTSensor{
    static isSystem = true

    static async identify(device){
        const name = await this.getDeviceProp(device,"Name")
        const uuids = await this.getDeviceProp(device,'UUIDs')
        return this
    }
    async init(){
        await super.init()
        this.currentProperties.Name= `Tracking: ${this.getManufacturer()}`
        // var md =this.addMetadatum("bleTracker",'db',"BLE Tracker")
        // md.isParam=true
        // md.enum=Array.from(this.constructor.classMap.keys())
        // md.enumNames=this.constructor.classMap

    }


}
module.exports=BleTracker