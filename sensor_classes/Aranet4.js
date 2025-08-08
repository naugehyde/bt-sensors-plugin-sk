const AranetSensor = require("./Aranet/AranetSensor");
class Aranet4 extends AranetSensor{
    
    constructor(device, config={}){
        super(device,config)
    }

    static async identify(device){
        const name = await this.getDeviceProp(device,"Name")
        
        if ((await super.identify(device) != null) && 
            name.toLowerCase().startsWith("aranet4")) {
            return this
        }
        return null
    }
    static ImageFile= "Aranet4.webp" 
    initSchema(){


        super.initSchema()
        this.addMetadatum('co2', 'ppm',  'co2 concentration in zone',
            (buff)=>{return ((buff.readUInt16LE(8)))})
            .default="environment.{zone}.co2"
            
        this.addDefaultPath('temp','environment.temperature')
        .read=
            (buff)=>{return parseFloat((273.15+(buff.readInt16LE(10))/20).toFixed(2))}     
            
        this.addDefaultPath("pressure","environment.pressure") 
        .read=(buff)=>{return ((buff.readUInt16LE(12)))/10}
      
        this.addDefaultPath('relativeHumidity','environment.relativeHumidity')
        .read=(buff)=>{return ((buff.readUInt8(14))/100)}
        
        this.addMetadatum('color', '',  'Warning color (G Y R)',
            (buff)=>{return this.COLOR[buff.readUInt8(16)]})
            .default="environment.{zone}.warningColor"
        
        this.addDefaultPath("battery","sensors.batteryStrength")   
            .read=(buff)=>{return ((buff.readUInt8(15))/100)}

                    
    }
    propertiesChanged(props){
        super.propertiesChanged(props)    
        if (!props.hasOwnProperty("ManufacturerData")) return

        const buff = this.getManufacturerData(0x0702)
        this.emitData("co2", buff)
        this.emitData("temp", buff)
        this.emitData("humidity", buff)
        this.emitData("pressure", buff)
        this.emitData("batteryStrength", buff)
        this.emitData("color", buff)
        
    }                    

}
module.exports=Aranet4