const BTSensor = require("../BTSensor");
class SwitchBotMeterPlus extends BTSensor{
    
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
            if (parseInt(id)==this.ID && sd[this.serviceDataKey].value[0] == this.modelID && sdKeys[0] == this.serviceDataKey)
               return this
        }
        return null

    }

    async init() {
        await super.init()
        this.initMetadata()
    }

    initMetadata(){

// Apply positive/negative (Byte[4] & 0x80), and convert to deg Kelvin
// Value returned by device is in deg C even when set to deg F.
// Refer https://github.com/OpenWonderLabs/SwitchBotAPI-BLE/blob/latest/devicetypes/meter.md#(new)-broadcast-message 

 
        this.addMetadatum('temp','K', 'temperature', 
            (buffer)=>{return (( (buffer[4] & 0x7f) + ((buffer[3] & 0x0f)/10) ) * ( (buffer[4] & 0x80)>0 ? 1 : -1 ) )  + 273.15 
        })
        this.addMetadatum('humidity','ratio', 'humidity', 
            (buffer)=>{return (buffer[5] & 0x7F)/100    
        })
        this.addMetadatum('battery','ratio', 'Battery Strength', (buffer)=>{return buffer[2]/100})
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
        return "SwitchBotMeterPlus"
    }

}
module.exports=SwitchBotMeterPlus
