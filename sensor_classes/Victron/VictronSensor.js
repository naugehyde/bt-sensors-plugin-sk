const BTSensor = require("../../BTSensor.js");
const crypto = require('node:crypto');
const VC = require('./VictronConstants.js');
function sleep(x) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(x);
      }, x);
    });
  }
  class VictronSensor extends BTSensor{

    constructor(device,config,gattConfig){
        super(device,config,gattConfig)
        this.encryptionKey = config?.encryptionKey
    }
    
    static async identifyMode(device, mode){
            
        var md = await this.getDeviceProp(device,'ManufacturerData')
        if (md==undefined || !Object.hasOwn(md,0x2e1)) 
            return null
        else {
            
            if (md[0x2e1].value[0]==0x10) {
                if (md[0x2e1].value[4]==mode)
                    return this
                else 
                    return null
            }

            var hasDataPacket=false
            device.helper._prepare()
            device.helper.on("PropertiesChanged",
                 (props)=> {
                    if (Object.hasOwn(props,'ManufacturerData')){
                        md = props['ManufacturerData'].value
                        hasDataPacket=md[0x2e1].value[0]==0x10
                    }
            })        
            while (!hasDataPacket) {
                await sleep(500)
            }
            device.helper.removeListeners()
            if (md[0x2e1].value[4]==mode)
                return this
            else
                return null
        } 
    }

    async init(){
        await super.init()
        const md =this.addMetadatum('encryptionKey','', "Encryption Key")
        md.isParam = true
        this.model_id=this.getManufacturerData(0x2e1)?.readUInt16LE(2)??"Unknown"
    }
    alarmReason(alarmValue){
        return this.constructor.AlarmReason[alarmValue]
    }
    getModelName(){
        return VC?.MODEL_ID_MAP[this.model_id]??this.constructor.name+" (Model ID:"+this.model_id+")"
    }

    decrypt(data){
        if (!this.encryptionKey)
            throw new Error("Unable to decrypt: no encryption key set")

        const encMethod = 'aes-128-ctr';
        const iv = data.readUInt16LE(5); 
        const key = Buffer.from(this.encryptionKey,'hex')
        const ivBuffer = Buffer.alloc(16); // 128 bits = 16 bytes
        
        ivBuffer.writeUInt16LE(iv)
        
        var encData = Buffer.from([...data.slice(8)])
        
        const decipher = crypto.createDecipheriv(encMethod, key, ivBuffer)
        
        const decData=decipher.update(encData)

        return Buffer.from(decData)
        
    }
    getName(){
        return `Victron ${this.getModelName()}`
    }
    propertiesChanged(props){
        super.propertiesChanged(props)
        if (this.usingGATT()) return
        
        try{
            const md = this.getManufacturerData(0x2e1)
            if (md && md.length && md[0]==0x10){
                const decData=this.decrypt(md)
                this.emitValuesFrom(decData)
            }
        }
        catch (error) {
            throw new Error(`Unable to read data from ${ this.getDisplayName()}: ${error}` )
        }
    }

    initGATTConnection(){
        throw new Error( "GATT Connection unimplemented for "+this.getDisplayName())
    }

   

}
module.exports=VictronSensor