const  VC = require( './VictronConstants.js');
const Images = require('./VictronImages.js')

const BTSensor = require("../../BTSensor.js");
const crypto = require('node:crypto');
function sleep(x) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(x);
      }, x);
    });
  }
  class VictronSensor extends BTSensor{
    static Domain = BTSensor.SensorDomains.electrical

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
        this.addParameter(
            "encryptionKey",
            {
                title:"Encryption Key"
            }
        )
        this.model_id=this.getManufacturerData(0x2e1)?.readUInt16LE(2)??"Unknown"
        this._schema.title = this.getName()
    }
    alarmReason(alarmValue){
        return this.constructor.AlarmReason[alarmValue]
    }
    getModelName(){
        const m = VC.MODEL_ID_MAP[this.model_id]
        if(m) {
            if(typeof m == 'string' || m instanceof String ) {
                return m
            } else {
                return m.name
            }
        }
        return this.constructor.name+" (Model ID:"+this.model_id+")"
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
        if (!props.hasOwnProperty("ManufacturerData")) return
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

   getImage(){
        const m = VC.MODEL_ID_MAP[this.model_id]
        if (m && m.image)
            return m.image
        else
            return Images.generic
   }

   getDescription(){
    //return `<img src="https://www.victronenergy.com/_next/image?url=https%3A%2F%2Fwww.victronenergy.com%2Fupload%2Fproducts%2FSmartShunt%2520500_nw.png&w=1080&q=70"" height="150" align=”top” ></img>`


    return `<img src="../bt-sensors-plugin-sk/images/${this.getImage()}" width="200" style="float: left; 
  margin: 20px;" ></img> 
    To get the encryption key for your device, follow the instructions <a href=https://communityarchive.victronenergy.com/questions/187303/victron-bluetooth-advertising-protocol.html target="_victron_encrypt">here</a>`
   }

}
module.exports=VictronSensor