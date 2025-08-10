const  VC = require( './VictronConstants.js');
const Images = require('./VictronImages.js')

const BTSensor = require("../../BTSensor.js");
const crypto = require('node:crypto');
const VictronIdentifier = require('./VictronIdentifier.js');

  class VictronSensor extends BTSensor{
    static Domain = BTSensor.SensorDomains.electrical
    static ManufacturerID = 0x2e1
    constructor(device,config,gattConfig){
        super(device,config,gattConfig)
        
        if (device.modelID)
            this.modelID=device.modelID        
    }

    
    static async getDataPacket(device, md){
        if (md && md[this.ManufacturerID]?.value[0]==0x10)
            return md[this.ManufacturerID].value

        device.helper._prepare()

        return new Promise((resolve, reject) => {
            device.helper.on("PropertiesChanged",
            (props)=> {
                if (Object.hasOwn(props,'ManufacturerData')){
                    const md = props['ManufacturerData'].value
                    if(md[this.ManufacturerID].value[0]==0x10) {
                        device.helper.removeListeners()
                        resolve(md[this.ManufacturerID].value)
                    }
                }
            })        
        })
    }
    
    static getModelID(md) {
        return md[this.ManufacturerID]?.value.readUInt16LE(2)??-1
    }

    static async identify(device){

        var md = await this.getDeviceProp(device,'ManufacturerData')
        if (md==undefined || !Object.hasOwn(md,this.ManufacturerID)) 
            return null
        const data=await this.getDataPacket(device,md)
        if (data) {
            device.modelID=this.getModelID(md)
            return VictronIdentifier.identify(data)
        } 
        return null
    }
   async init(){
        await super.init()
        this.addParameter(
            "encryptionKey",
            {
                title:"Encryption Key",
                isRequired: true
            }
        )
    }
    alarmReason(alarmValue){
        return this.constructor.AlarmReason[alarmValue]
    }
    getModelName(){
        const mID = this.getModelID()
        const m = VC.MODEL_ID_MAP[mID]
        if(m) {
            if(typeof m == 'string' || m instanceof String ) {
                return m
            } else {
                return m.name
            }
        }
        return this.constructor.name+` (Model ID: ${mID==-1?"Unknown":mID})`
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
    getModelID(){
        if (!this.modelID ||this.modelID==-1)
            this.modelID=this.getManufacturerData(this.constructor.ManufacturerID)?.readUInt16LE(2)??-1

        return this.modelID
    }

    getName(){
        return `Victron ${this.getModelName()}`
    }
    propertiesChanged(props){
        super.propertiesChanged(props)
        if (this.usingGATT()) return
        if (!props.hasOwnProperty("ManufacturerData")) return
        try{
            const md = this.getManufacturerData(this.constructor.ManufacturerID)
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

   getImage(){
        const m = VC.MODEL_ID_MAP[this.getModelID()]
        if (m && m.image)
            return m.image
        else
            return Images.generic
   }

   getTextDescription(){
    //return `<img src="https://www.victronenergy.com/_next/image?url=https%3A%2F%2Fwww.victronenergy.com%2Fupload%2Fproducts%2FSmartShunt%2520500_nw.png&w=1080&q=70"" height="150" align=”top” ></img>`


    return `To get the encryption key for your device, follow the instructions <a href=https://communityarchive.victronenergy.com/questions/187303/victron-bluetooth-advertising-protocol.html target="_victron_encrypt">here</a>`
   }

   prepareConfig(config){
        super.prepareConfig(config)
        config.params.modelID=this.getModelID()
    }

}
module.exports=VictronSensor