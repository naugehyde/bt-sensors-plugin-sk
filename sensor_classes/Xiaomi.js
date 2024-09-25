const BTSensor = require("../BTSensor");

const crypto = require('crypto');

class Xiaomi extends BTSensor{
    constructor(device,params){
        super(device,params)
        this.pollFreq = params?.pollFreq
        this.bindKey = params?.bindKey
    }

    static async identify(device){
        try{
            const sd = await device.getProp('ServiceData')
            if (sd == null || sd.length==0) return null
            const keys = Object.keys(sd)
            if (parseInt(keys[0].substring(0,8),16)==0xFE95) return this
        } catch (e){
            console.log(e)
            return null
        }
        return null
    }
    static {
        this.metadata = new Map(super.getMetadata())
        var  md = this.addMetadatum("pollFreq", "s", "polling frequency in seconds")
        md.isParam=true

        //3985f4ebc032f276cc316f1f6ecea085
        //8a1dadfa832fef54e9c1d190

        md = this.addMetadatum("bindKey", "", "bindkey for decryption")
        md.isParam=true
        this.addMetadatum('temp','K', 'temperature',
            (buff,offset)=>{return ((buff.readInt16LE(offset))/100) + 273.1})
        this.addMetadatum('humidity','ratio', 'humidity',
            (buff,offset)=>{return ((buff.readUInt8(offset))/100)})
        this.addMetadatum('voltage', 'V',  'sensor battery voltage',
            (buff,offset)=>{return ((buff.readUInt16LE(offset))/1000)})
       
    }

    #emitValues(buffer){
        this.emitData("temp", buffer, 0)
        this.emitData("humidity", buffer,2)
        this.emitData("voltage",buffer,3);
    }
    async #connect(){
        await this.device.connect()
        const gattServer = await this.device.gatt()
        const gattService = await gattServer.getPrimaryService("ebe0ccb0-7a0a-4b0c-8a1a-6ff2997da3a6")
        this.gattCharacteristic = await gattService.getCharacteristic("ebe0ccc1-7a0a-4b0c-8a1a-6ff2997da3a6")
    }

    decrypt(data){
        const encryptedPayload = data.subarray(11,-7);
        const xiaomi_mac = data.subarray(5,11)
        const nonce = Buffer.concat([xiaomi_mac, data.subarray(2, 5), data.subarray(-7,-4)]);
        const cipher = crypto.createDecipheriv('aes-128-ccm', Buffer.from(this.bindKey,"hex"), nonce, { authTagLength: 4});
        cipher.setAAD(Buffer.from('11', 'hex'), { plaintextLength: encryptedPayload.length });
        cipher.setAuthTag(data.subarray(-4))    
        return cipher.update(encryptedPayload)
    }

    async #connectEncrypted(){
        this.cb=async()=>{
            const sd = await this.device.getProp("ServiceData")
            const dec = this.decrypt(sd["0000fe95-0000-1000-8000-00805f9b34fb"].value)
            switch(dec[0]){
            case 0x04:    
                console.log("temp")
                this.emit("temp",(dec.readInt16LE(3)/10)+273.15)  
                break        
            case 0x06:
                console.log("humidity")
                this.emit("humidity",(dec.readInt16LE(3)/10))          
                break
            default:
                console.log("wait wha?"+ dec[0])
            }
        }
        await this.cb()
        this.device.helper.on("PropertiesChanged",async (props)=>{
            await this.cb()
        })
    }
   
    #setupEmission(){
   
        if (this.pollFreq){
            this.device.disconnect().then(()=>{
                this.intervalID = setInterval( async () => {            
                    try{
                        await this.#connect()
                        const buffer = await this.gattCharacteristic.readValue()
                        this.#emitValues(buffer)
                    }
                    catch{(error)
                        throw new Error(`unable to get values for device LYWSD03MMC:${error.message}`)
                    }
                    try { await this.device.disconnect() }
                    catch{(error)
                        console.log("Error disconnecting from LYWSD03MMC: "+error.message)
                    }
                    }, this.pollFreq*1000)
                })
            }
        else {
           this.gattCharacteristic.startNotifications().then(()=>{    
                this.gattCharacteristic.on('valuechanged', buffer => {
                    this.#emitValues(buffer)
                })
            })
        }
    }
    async connect() {
        if (this.bindKey)
            this.#connectEncrypted()
        else{
            await this.#connect()
            this.gattCharacteristic.readValue().then((buffer)=>{
                this.#emitValues(buffer)
                this.#setupEmission()
            })
        }
        return this
    }
    async #disconnectGattCharacteristic(){
        if (this.gattCharacteristic  && await this.gattCharacteristic.isNotifying()) {
            await this.gattCharacteristic.stopNotifications()
            this.gattCharacteristic=null
        }
    }
    async disconnect(){
        super.disconnect()
        await this.#disconnectGattCharacteristic()
        if (this.cb){
            this.device.helper.removeListener("PropertiesChanged",this.cb)
        }
        if (this.intervalID){
            clearInterval(this.intervalID)
        }
        if (await this.device.isConnected()){
               await this.device.disconnect()
        }
    }
}
module.exports=Xiaomi