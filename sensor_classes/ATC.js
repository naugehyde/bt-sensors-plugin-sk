const BTSensor = require("../BTSensor");
class ATC extends BTSensor{
    
    constructor(device, config={}){
        super(device,config)
        if (config.parser){
            this.parser=config.parser
        }
    }
    static async identify(device){
        const regex = /^ATC_[A-Fa-f0-9]{6}$/
        const name = await this.getDeviceProp(device,"Name")
        if (name && name.match(regex))
            return this
        else
            return null
    }
  
    async init() {
        await super.init()
        const md=this.addMetadatum('parser','','data parsing strategy')
        md.isParam=true
        md.enum=["ATC-LE","ATC-BE"]
        if (!this.parser){
            this.parser="ATC-LE"
        }
        this.initMetadata()
    }
    initMetadata(){
        if (this.parser=="ATC-LE"){
            this.addMetadatum('voltage', 'V',  'sensor battery voltage',
                (buff)=>{return ((buff.readUInt16LE(10))/1000)})
            this.addMetadatum('batteryStrength', 'ratio',  'sensor battery strength',
                (buff)=>{return ((buff.readUInt8(12))/100)})
            this.addMetadatum('temp','K', 'temperature',
                (buff)=>{return parseFloat((273.15+(buff.readInt16LE(6))/100).toFixed(2))})
            this.addMetadatum('humidity','ratio', 'humidity',
                (buff)=>{return ((buff.readUInt16LE(8))/10000)})
        
            } else{
                this.addMetadatum('voltage', 'V',  'sensor battery voltage',
                    (buff)=>{return ((buff.readUInt16BE(10))/1000)})
                this.addMetadatum('batteryStrength', 'ratio',  'sensor battery strength',
                    (buff)=>{return ((buff.readUInt8(9))/100)})
                this.addMetadatum('temp','K', 'temperature',
                    (buff)=>{return parseFloat((273.15+(buff.readInt16BE(6))/10).toFixed(2))})
                this.addMetadatum('humidity','ratio', 'humidity',
                    (buff)=>{return ((buff.readUInt8(8))/100)})
            
            }
    }
    propertiesChanged(props){
        super.propertiesChanged(props)    
        if (!props.hasOwnProperty("ServiceData")) return

        const buff = this.getServiceData("0000181a-0000-1000-8000-00805f9b34fb")
        if (!buff)
            throw new Error("Unable to get service data for "+this.getDisplayName())
        this.emitData("temp", buff)
        this.emitData("humidity", buff)
        this.emitData("voltage", buff)
        this.emitData("batteryStrength", buff)
        
    }                    
    getManufacturer(){
        return "ATC1441 (custom firmware see: https://github.com/atc1441)"
    }
}
module.exports=ATC