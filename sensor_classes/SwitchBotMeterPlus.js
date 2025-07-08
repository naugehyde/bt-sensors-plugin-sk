const BTSensor = require("../BTSensor");
class SwitchBotMeterPlus extends BTSensor{
    static Domain = BTSensor.SensorDomains.environmental
		
    constructor(device, config={}){
        super(device,config)
        if (config.parser){
            this.parser=config.parser
        }
    }

    static ID = 0x0969
    static serviceDataKey = "0000fd3d-0000-1000-8000-00805f9b34fb"
    static modelID = 0x69

    static async  identify(device){
        const md = await this.getDeviceProp(device,'ManufacturerData')
        const sd = await this.getDeviceProp(device,'ServiceData')

        if (!md) return null 
        if (!sd) return null

        const sdKeys = Object.keys(sd)
        const keys = Object.keys(md)
        if ( (keys && keys.length>0) && (sdKeys && sdKeys.length >0) ){
            const id = keys[keys.length-1]
            if (parseInt(id)==this.ID && md[id][0]==this.modelID && sdKeys[0] == this.serviceDataKey)
               return this
        }
        return null

    }


    initSchema(){

// Apply positive/negative (Byte[4] & 0x80), and convert from deg F if selected (Byte[5] & 0x80) Then convert to deg Kelvin
// Refer https://github.com/OpenWonderLabs/SwitchBotAPI-BLE/blob/latest/devicetypes/meter.md#(new)-broadcast-message 
 
        super.initSchema()
        this.addDefaultParam("zone")

        this.addDefaultPath('temp', 'environment.temperature')
        .read= (buffer)=>{return (( ( ( (buffer[4] & 0x7f) + ((buffer[3] & 0x0f)/10) ) * ( (buffer[4] & 0x80)>0 ? 1 : -1 ) ) - ( (buffer[5] & 0x80)>0 ? 32 : 0) ) / ( (buffer[5] & 0x80)>0 ? 1.8 : 1) ) + 273.15 }
        this.addDefaultPath('humidity', 'environment.humidity')
        .read=(buffer)=>{return (buffer[5] & 0x7F)/100}
        this.addDefaultPath('battery', 'environment.batteryStrength')
        .read=(buffer)=>{return buffer[2]/100}
    }

    propertiesChanged(props){
        super.propertiesChanged(props)    
        const buff = this.getServiceData("0000fd3d-0000-1000-8000-00805f9b34fb")
        if (!buff)
            throw new Error("Unable to get service data for "+this.getDisplayName())
        this.emitData("temp", buff)
        this.emitData("humidity", buff)
        this.emitData("battery", buff)
        
    }                    
    getManufacturer(){
        return "Wonder Labs"
    }

    getName() {
        return `SwitchBot Meter Plus (${this?.name??"Unnamed"})` 
    }

}
module.exports=SwitchBotMeterPlus
