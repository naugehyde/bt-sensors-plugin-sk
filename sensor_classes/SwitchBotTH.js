const BTSensor = require("../BTSensor");

class SwitchBotTH extends  BTSensor {
    static Domain = BTSensor.SensorDomains.environmental
		
    static async test(){

        const p = {[this.ID.toString()]: [0xd8, 0x35, 0x34, 0x38, 0x4f, 0x70, 0x07, 0x02, 0x04, 0x96, 0x2c, 0x00]}
        this.getDeviceProp=async ()=>{
            return p
        }
        const c = await this.identify()
        const sb = new c()
        sb.initSchema()
        sb.currentProperties={}
        sb.on("temp", (t)=>console.log(t))
        sb.on("humidity", (h)=>console.log(h))
        sb.on("battery", (b)=>console.log(b))

        sb.propertiesChanged( {ManufacturerData: p})
        
        sb.propertiesChanged( {ServiceData: {[this.batteryService]:[0x77,0x00,0x64]}})

    
    }
    static ID = 0x0969
    static modelID = 0x77
    static batteryService = "0000fd3d-0000-1000-8000-00805f9b34fb"
    static async  identify(device){
        const md = await this.getDeviceProp(device,'ManufacturerData')
        if (!md) return null 
        const keys = Object.keys(md)
        if (keys && keys.length>0){
            const id = keys[keys.length-1]
            if (parseInt(id)==this.ID && md[id].length==12 && md[id][0]==this.modelID)
                return this
        } 
        return null
        
    }

    initSchema(){
        super.initSchema()
        this.addDefaultParam("zone")

        this.addDefaultPath('temp', 'environment.temperature') 
        .read=(buffer)=>{
                return (27315+(((buffer[8] & 0x0F)/10 + (buffer[9] & 0x7F)) * (((buffer[9] & 0x80)>0)?100:-100)))/100
        }
        this.addDefaultPath('humidity','environment.humidity')
        .read=(buffer)=>{return (buffer[10] & 0x7F)/100}
        
        this.addDefaultPath("battery", "environment.batteryStrength")
        .read=(buffer)=>{return buffer[2]/100}
         
    }

    getManufacturer(){
        return "Wonder Labs"
    }
    getName() {
        return `SwitchBotTH (${this?.name??"Unnamed"})` 
    }
    async propertiesChanged(props){
        super.propertiesChanged(props)    
        if (props.ManufacturerData) {
            const buffer = this.getManufacturerData(this.constructor.ID)
            if (buffer) {
                this.emitData("temp", buffer)
                this.emitData("humidity", buffer)
            }      
        }
        if (props.ServiceData) {
            const buffer = this.getServiceData(this.constructor.batteryService)
            if (buffer){
                this.emitData("battery", buffer)
            }
        }
   }                         
}
module.exports=SwitchBotTH
