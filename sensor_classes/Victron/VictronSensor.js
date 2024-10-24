const BTSensor = require("../../BTSensor.js");
const crypto = require('node:crypto');
const int24 = require('int24')
const util = require('util')
const VC = require('./VictronConstants.js');
const BLACKLISTED = require("../BlackListedDevice.js");
 
  class VictronSensor extends BTSensor{

    constructor(device,config,gattConfig){
        super(device,config,gattConfig)
        this.encryptionKey = config?.encryptionKey
    }
   
    static async identifyMode(device, mode){

        try{
            const md = await this.getDeviceProp(device,'ManufacturerData')
            if (!md) return null   
            const data = md[0x2e1]
            if (data && data.value[0]==0x2) { //VE.Smart is on
                return BLACKLISTED
            }
            if (data && data.value[0]==0x10 && data.value[4]==mode)
                return this
            else {
                return null
            }
        } catch (e){
            console.log(e)
            return null
        }
        
    }


    async init(){
        await super.init()
        var md = this.addMetadatum('encryptionKey','', "Encryption Key")
        md.isParam = true
        this.metadata = new Map(super.getMetadata())
        md = this.addMetadatum('encryptionKey','', "Encryption Key")
        md.isParam = true
        this.model_id=this.getManufacturerData(0x2e1).readUInt16LE(2)
    }
    alarmReason(alarmValue){
        return this.constructor.AlarmReason[alarmValue]
    }
    getModelName(){
        return VC?.MODEL_ID_MAP[this.model_id]??this.constructor.name+" (Model ID:"+this.model_id+")"
    }

    decrypt(data){
        if (!this.encryptionKey)
            throw Error("Unable to decrypt: no encryption key set")

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