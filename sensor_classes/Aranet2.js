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
    async init() {
        await super.init()
        this.initMetadata()
    }

    initMetadata(){
            this.addMetadatum('c02', '',  'c02 concentration',
                (buff)=>{return ((buff.readUInt16LE(8)))})
            this.addMetadatum('temp','K', 'temperature',
                (buff)=>{return parseFloat((273.15+(buff.readInt16LBE(15))/1000).toFixed(2))})

            this.addMetadatum("pressure","","atmospheric pressure", 
                (buff)=>{return ((buff.readUInt16LE(13)))/10})
            this.addMetadatum('batteryStrength', 'ratio',  'sensor battery strength',
                (buff)=>{return ((buff.readUInt8(12))/100)})

            this.addMetadatum('humidity','ratio', 'humidity',
                (buff)=>{return ((buff.readUInt16LE(8))/10000)})
        
    }
    propertiesChanged(props){
        super.propertiesChanged(props)    
        const buff = this.getManufacturerData(0x0702)
        this.emitData("temp", buff)
        this.emitData("humidity", buff)
        this.emitData("pressure", buff)
        this.emitData("batteryStrength", buff)
        
    }                    

}
module.exports=Aranet2