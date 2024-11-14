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
    
    async init() {
        await super.init()
        this.initMetadata()
    }

    initMetadata(){
            this.addMetadatum('co2', 'ppm',  'co2 concentration',
                (buff)=>{return ((buff.readUInt16LE(8)))})
            this.addMetadatum('temp','K', 'temperature',
                (buff)=>{return parseFloat((273.15+(buff.readInt16LE(10))/20).toFixed(2))})

            this.addMetadatum("pressure","hPa","atmospheric pressure", 
                (buff)=>{return ((buff.readUInt16LE(12)))/10})

            this.addMetadatum('humidity','ratio', 'humidity',
                (buff)=>{return ((buff.readUInt8(14))/100)})
            this.addMetadatum('batteryStrength', 'ratio',  'sensor battery strength',
                (buff)=>{return ((buff.readUInt8(15))/100)})
            this.addMetadatum('color', '',  'Warning color (G Y R)',
                (buff)=>{return this.COLOR[buff.readUInt8(16)]})
            
    }
    propertiesChanged(props){
        super.propertiesChanged(props)    
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