const BTSensor = require("../BTSensor");
class ATC extends BTSensor{
    static Domain = this.SensorDomains.environmental
    
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
        this.addParameter(
            "parser",
            {
                title:'data parsing strategy',
                type: 'string',
                enum:["ATC-LE","ATC-BE", "ATC-Exploit"],
                default: "ATC-LE"
            }
        )
        if (!this.parser){
            this.parser="ATC-LE"
        }
    }
    initSchema(){
        super.initSchema()
        this.addDefaultParam("zone")

        this.addDefaultPath('batteryStrength','sensors.batteryStrength')
        .read=(buff)=>{return ((buff.readUInt8(12))/100)}

        if (this.parser=="ATC-LE"){
            this.addDefaultPath('voltage','sensors.batteryVoltage')
                .read=(buff)=>{return ((buff.readUInt16LE(10))/1000)}

            this.addDefaultPath('temp', 'environment.temperature')
                .read=(buff)=>{return parseFloat((273.15+(buff.readInt16LE(6))/100).toFixed(2))}
 
            this.addDefaultPath('humidity','environment.humidity')
                .read=(buff)=>{return ((buff.readUInt16LE(8))/10000)}
        
            } else{

                if (this.parser=="ATC-Exploit"){
                this.getPath("batteryStrength")
                    .read=(buff)=>{return ((buff.readUInt8(9))/100)}

                this.addDefaultPath('voltage','sensors.batteryVoltage')
                    .read=(buff)=>{return ((buff.readUInt16BE(10))/1000)}

                this.addDefaultPath('temp', 'environment.temperature')
                    .read=(buff)=>{return parseFloat((273.15+(buff.readInt16BE(6))/10).toFixed(2))}

                this.addDefaultPath('humidity','environment.humidity')
                    .read=(buff)=>{return ((buff.readUInt8(8))/100)} 
                } 
                else{
                this.addDefaultPath('voltage','sensors.batteryVoltage')
                    .read=(buff)=>{return ((buff.readUInt16BE(10))/1000)}

                this.addDefaultPath('temp', 'environment.temperature')
                    .read=(buff)=>{return parseFloat((273.15+(buff.readInt16BE(6))/100).toFixed(2))}

                this.addDefaultPath('humidity','environment.humidity')
                    .read=(buff)=>{return ((buff.readUInt16BE(8))/10000)}
                }
                
            }
    }
    propertiesChanged(props){
        super.propertiesChanged(props)    
        if (!props.hasOwnProperty("ServiceData")) return

        var buff = this.getServiceData("0000181a-0000-1000-8000-00805f9b34fb")
        if (!buff)
            buff = this.getServiceData("0000fcd2-0000-1000-8000-00805f9b34fb")
            if (!buff)
                throw new Error("Unable to get service data for "+this.getDisplayName())
            
        this.emitData("temp", buff)
        this.emitData("humidity", buff)
        this.emitData("voltage", buff)
        this.emitData("batteryStrength", buff)
        
    }
    static ImageFile= "ATC.jpeg"                    
    getManufacturer(){
        return "ATC1441 (custom firmware see: https://github.com/atc1441)"
    }

    getDescription(){
        return `<div><p><img src=${this.getImageSrc()}${this.getImageFile()} alt="ATC/LYWSD03MMC image" style="float: left; margin-right: 10px;" />
        Xiaomi LYWSD03MMC custom firmware provided by <b>ATC1441</b>. 
        For more information, see: <a href=https://github.com/atc1441/ATC_MiThermometer?tab=readme-ov-file#atc_mithermometer target="_blank">ATC_MiThermometer</a><div>`
    }
}
module.exports=ATC