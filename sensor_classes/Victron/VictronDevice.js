const BTSensor = require("../../BTSensor.js");
const crypto = require('node:crypto');
const int24 = require('int24')
const util = require('util')
const VC = require('./VictronConstants.js')
 
  class VictronDevice extends BTSensor{

    constructor(device,params){
        super(device,params)
        this.encryptionKey = params?.encryptionKey
    }
   
    static {
        this.metadata = new Map(super.getMetadata())
        const md = this.addMetadatum('encryptionKey','', "Encryption Key")
        md.isParam = true
    }

    static async identifyMode(device, mode){

        try{
            const md = await this.getDeviceProp(device,'ManufacturerData')
            if (!md) return null   
            const data = md[0x2e1]
            if (data && data.value[0]==0x10 && data.value[4]==mode)
                return this
            else
                return null
        } catch (e){
            console.log(e)
            return null
        }
        
    }

    getAuxModeAndCurrent(offset, decData=null){
        if (decData==null){
            decData=this.getManufacturerData(0x2e1)
            if (this.encryptionKey)
                decData=this.decrypt(decData)
            else 
                return {current:NaN, auxMode:NaN}
        } 
        const auxModeAndCurrent = int24.readInt24LE(decData,offset)
        return {
            current : (this.NaNif(auxModeAndCurrent >> 2,0x3FFFFF))/1000,
            auxMode : auxModeAndCurrent & 0b11
        }
    }

    async init(){
        await super.init()
        this.model_id=this.getManufacturerData(0x2e1).readUInt16LE(2)
    }
    alarmReason(alarmValue){
        return this.constructor.AlarmReason[alarmValue]
    }
    getModelName(){
        return VC.MODEL_ID_MAP[this.model_id]
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
        if (this.useGATT()) return
        try{
            const buff = this.getManufacturerData(0x2e1)             
            const decData=this.decrypt(buff)
            this.emitValuesFrom(decData)
        }
        catch (error) {
            throw new Error(`Unable to read data from ${ this.getDisplayName()}: ${error}` )
        }
    }
    useGATT(){
        return this.encryptionKey == undefined
    }

    initGATT(){
        throw new Error( "GATT Connection unimplemented for "+this.getDisplayName())
    }

   

}
module.exports=VictronDevice