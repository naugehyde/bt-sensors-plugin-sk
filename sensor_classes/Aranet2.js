const AranetSensor = require("./Aranet/AranetSensor");
class Aranet2 extends AranetSensor{
    
    constructor(device, config={}){
        super(device,config)
    }
    static async identify(device){
        const name = await this.getDeviceProp(device,"Name")
        
        if ((await super.identify(device)!=null) && 
            name.toLowerCase().startsWith("aranet2")) {
            console.log("Aranet2 not currently supported")
            return null //not supported for now
        }
    }

    initSchema(){
            super.initSchema()
            
            this.addMetadatum('co2', 'ppm',  'co2 concentration in zone',
                (buff)=>{return ((buff.readUInt16LE(8)))})
                .default="environment.{zone}.co2"
            
            this.addDefaultPath('temp', 'environment.temperature')
            .read=(buff)=>{return parseFloat((273.15+(buff.readInt16LBE(15))/1000).toFixed(2))}

            this.addDefaultPath('pressure', 'environment.pressure')
            .read=  (buff)=>{return ((buff.readUInt16LE(13)))/10}
            
            this.addDefaultPath('relativeHumidity','environment.relativeHumidity')
            .read=(buff)=>{return ((buff.readUInt16LE(8))/10000)}
                
            this.addDefaultPath("battery","sensors.batteryStrength")   
                .read=(buff)=>{return ((buff.readUInt8(12))/100)}

    }
    propertiesChanged(props){
        super.propertiesChanged(props)
        if (!props.hasOwnProperty("ManufacturerData")) return

        const buff = this.getManufacturerData(0x0702)
        this.emitData("temp", buff)
        this.emitData("humidity", buff)
        this.emitData("pressure", buff)
        this.emitData("batteryStrength", buff)
        
    }       
    static ImageFile= "Aranet2.webp" 
              

}
module.exports=Aranet2