const BTSensor = require("../BTSensor");

class LancolVoltageMeter extends BTSensor{

    static Domain = BTSensor.SensorDomains.electrical
    static ImageFile = "LancolVoltageMeter.webp"

    static async  identify(device){

        const name = await this.getDeviceProp(device,"Name")
        const regex = /^Lancol *[0-9]{1,3}\.[0-9]{1,2}V/
 
        if (name && name.match(regex))  
            return this
        else
            return null
        
    }

    initSchema(){
        super.initSchema()
        this.addDefaultParam("batteryID")
        this.addDefaultPath('voltage',"electrical.batteries.voltage")
    }

    getManufacturer(){
        return "Lancol"
    }
    async propertiesChanged(props){
        super.propertiesChanged(props)    
        
        if (props.Name) {
            const regex = /[+-]?([0-9]*[.])?[0-9]+/
            const r = this.valueIfVariant(props.Name).match(regex)
            if (r) {
                this.emit("voltage",parseFloat([...r][0]))
            } else {
                this.debug(`Unable to parse Name property for ${this.getName()}: ${props.Name}`)
            }
        }
   }                         
}
module.exports=LancolVoltageMeter