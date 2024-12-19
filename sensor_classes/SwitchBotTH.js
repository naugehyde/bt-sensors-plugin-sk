const BTSensor = require("../BTSensor");

class SwitchBotTH extends  BTSensor {
    static async test(){

        
         this.getDeviceProp=async ()=>{
            const p = {}
            p[this.ID.toString()]=[0xd8, 0x35, 0x34, 0x38, 0x4f, 0x70, 0x07, 0x02, 0x04, 0x96, 0x2c, 0x00]
            return p
        }
        const c = await this.identify()
        const sb = new c()
        sb.initMetadata()
        sb.currentProperties={}
        sb.on("temp", (t)=>console.log(t))
        sb.on("humidity", (h)=>console.log(h))
        sb.propertiesChanged( {ManufacturerData: await c.getDeviceProp()})
    
    }
    static ID = 0x0969
    static async  identify(device){
        const md = await this.getDeviceProp(device,'ManufacturerData')
        if (!md) return null 
        const keys = Object.keys(md)
        if (keys && keys.length>0){
            const id = keys[keys.length-1]
            if (parseInt(id)==this.ID && md[id].length==12)
                return this
        } 
        return null
        
    }

    async init(){
        await super.init()
        this.initMetadata()
    }
    initMetadata(){
        this.addMetadatum('temp','K', 'temperature', 
            (buffer)=>{
                return (27315+(((buffer[8] & 0x0F)/10 + (buffer[9] & 0x7F)) * (((buffer[9] & 0x80)>0)?100:-100)))/100
            })
        this.addMetadatum('humidity','ratio', 'humidity', 
        
            (buffer)=>{return (buffer[10] & 0x7F)/100    
        })
    }

    getManufacturer(){
        return "Wonder Labs"
    }
    getName() {
        "SwitchBotTH"
    }
    async propertiesChanged(props){
        super.propertiesChanged(props)    
        if (props.ManufacturerData) {
            const buffer = this.getManufacturerData(this.constructor.ID)
            if (buffer) {
               this.emitValuesFrom(buffer)
            }      
        }
   }                         
}
module.exports=SwitchBotTH
