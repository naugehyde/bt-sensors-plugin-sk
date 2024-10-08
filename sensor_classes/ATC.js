const BTSensor = require("../BTSensor");
class ATC extends BTSensor{

    static async identify(device){
        try{
            const regex = /^ATC_[A-Fa-f0-9]{6}$/
            const name = await this.getDeviceProp(device,"Name")
            if (name && name.match(regex)){
                return this
            }
        } catch (e){
            return null
        }
        return null
    }
  
    static {
        this.metadata = new Map(super.getMetadata())
        this.addMetadatum('temp','K', 'temperature',
            (buff,offset)=>{return ((buff.readInt16LE(offset))/100) + 273.1})
        this.addMetadatum('humidity','ratio', 'humidity',
            (buff,offset)=>{return ((buff.readUInt16LE(offset))/10000)})
        this.addMetadatum('voltage', 'V',  'sensor battery voltage',
            (buff,offset)=>{return ((buff.readUInt16LE(offset))/1000)})
    }
    propertiesChanged(props){
        super.propertiesChanged(props)    
        const buff = this.getServiceData("0000181a-0000-1000-8000-00805f9b34fb")
        if (!buff)
            throw new Error("Unable to get service data for "+this.getDisplayName())
        this.emitData("temp", buff, 6)
        this.emitData("humidity", buff, 8)
        this.emitData("voltage", buff, 10)
    }                    
}
module.exports=ATC