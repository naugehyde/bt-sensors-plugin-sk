const BTSensor = require("../BTSensor");

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

        //f8a49c8c7fe0df5a0028538ade2c3a16

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
        
        await this.#connect()
        this.gattCharacteristic.readValue().then((buffer)=>{
            this.#emitValues(buffer)
            this.#setupEmission()
        })
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
        
        if (this.intervalID){
            clearInterval(this.intervalID)
        }
        if (await this.device.isConnected()){
               await this.device.disconnect()
        }
    }
}
module.exports=Xiaomi