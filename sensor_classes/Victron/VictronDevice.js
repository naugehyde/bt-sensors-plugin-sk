const BTSensor = require("../../BTSensor.js");
const crypto = require('node:crypto');
const int24 = require('int24')
const util = require('util')
const VC = require('./VictronConstants.js')
 
  class VictronDevice extends BTSensor{

    constructor(device,params){
        super(device,params)
        this.advertisementKey = params?.advertisementKey
    }
   
    static {
        this.getMetadata().set('advertisementKey',{description: "Advertisement Key", isParam: true})
    }

    static async identifyMode(device, mode){

        try{
            if (VictronDevice.identify(device)==null)
                return null
            
            if (await this.getMode(device)==mode)
                return this

        } catch (e){
            console.log(e)
            return null
        }
        return null
    }
    
    static async identify(device){
        try{
           
            const md = await device.getProp('ManufacturerData')
            if (!md) return null   
            const data = md[0x2e1]
            if (data && data.value[0]==0x10)
                return this

        } catch (e){
            console.log(e)
            return null
        }
        return null
    }    
    static async getMode(device, md = null){
        if (md ==null)
            md = await device.getProp('ManufacturerData')
        if (md==undefined) return null
        const data = md[0x2e1]
        if (data==undefined || data.value.length<8) return null
        return data.value.readUInt8(4)
            
    }

    async getAuxModeAndCurrent(offset, decData=null){
        if (decData==null){
            decData=await this.device.getProp('ManufacturerData')
            if (!decData) throw Error("Unable to get Manufacturer data")
            if (this.advertisementKey)
                decData=this.decrypt(decData[0x2e1].value)
            else 
                return {current:NaN, auxMode:NaN}
        } 
        const auxModeAndCurrent = int24.readInt24LE(decData,offset)
        return {
            current : (auxModeAndCurrent >> 2)/1000,
            auxMode : auxModeAndCurrent & 0b11
        }
    }

    async init(){
        super.init()
        const md = await this.device.getProp('ManufacturerData')
        if (!md) throw Error("Unable to get Manufacturer data")
        this.model_id=md[0x2e1].value.readUInt16LE(2)
    }

    alarmReason(alarmValue){
        return this.constructor.AlarmReason[alarmValue]
    }
    getModelName(){
        return VC.MODEL_ID_MAP[this.model_id]
    }
    decrypt(data){
        if (!this.advertisementKey)
            throw Error("Unable to decrypt: no Advertisement key set")

        const encMethod = 'aes-128-ctr';
        const iv = data.readUInt16LE(5); 
        const key = Buffer.from(this.advertisementKey,'hex')
        const ivBuffer = Buffer.alloc(16); // 128 bits = 16 bytes
        
        ivBuffer.writeUInt16LE(iv)
        
        var encData = Buffer.from([...data.slice(8)])
        
        const decipher = crypto.createDecipheriv(encMethod, key, ivBuffer)
        
        const decData=decipher.update(encData)

        return decData
        
    }
    async getName(){
        return `Victron ${this.getModelName()}`
    }
   
    async connect() {
        if (this.advertisementKey){
            this.cb = async (propertiesChanged) => {
                try{
                    const data = 
                    await this.device.getManufacturerData()             
                    const buff=data[0x2e1];
                    const decData=this.decrypt(buff)
                    this.emitValuesFrom(decData)
                }
                catch (error) {
                    throw new Error(`Unable to read data from ${await this.getDisplayName()}: ${error}` )
                }
            }
            this.cb()
            this.device.helper.on('PropertiesChanged', this.cb)
            return this
        }
        else return this.gatt_connect()
    }
    gatt_connect(){
        throw new Error( "GATT Connection unimplemented")
    }
    disconnect(){
        super.disconnect()
        if (this.cb)
            this.device.helper.removeListener('PropertiesChanged',this.cb)
    }

}
module.exports=VictronDevice