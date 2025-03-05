const BTSensor = require("../BTSensor");

class LancolVoltageReader extends BTSensor{

    static async  identify(device){

        const name = await this.getDeviceProp(device,"Name")
        const regex = /^Lancol *[0-9]{1,3}\.[0-9]{1,2}V/
 
        if (name && name.match(regex))  
            return this
        else
            return null
        
    }

    async init(){
        await super.init()
        this.addMetadatum('voltage','V', 'battery voltage')
    }

    getManufacturer(){
        return "Lancol"
    }
    async propertiesChanged(props){
        super.propertiesChanged(props)    
        const regex = /^[0-9]{1,3}\.[0-9]{1,2}V/
        
        if (props.Name) {
            the.emitData("voltage",parseFloat(props.Name.match(regex)))
        }
   }                         
}
module.exports=LancolVoltageMeter