const BTSensor = require("../BTSensor");

class LYWSD03MMC extends BTSensor{

    static async identify(device){
        try{
            if (await device.getNameSafe() == 'LYWSD03MMC' || await device.getAliasSafe() == 'LYWSD03MMC') 
            {
                return this
            }
        } catch (e){
            console.log(e)
            return null
        }
        return null
    }
    static {
        this.metadata = new Map(super.getMetadata())
        this.addMetadatum('temp','K', 'temperature',
            (buff,offset)=>{return ((buff.readInt16LE(offset))/100) + 273.1})
        this.addMetadatum('humidity','ratio', 'humidity',
            (buff,offset)=>{return ((buff.readInt8(offset))/100)})
        this.addMetadatum('voltage', 'V',  'sensor battery voltage',
            (buff,offset)=>{return ((buff.readUInt16LE(offset))/1000)})
    }

    emitValues(buffer){
        this.emitData("temp", buffer, 0)
        this.emitData("humidity", buffer,2)
        this.emitData("voltage",buffer,3);
    }

    async connect() {
        try{
            await this.device.connect()
            var gattServer = await this.device.gatt()
            var gattService = await gattServer.getPrimaryService("ebe0ccb0-7a0a-4b0c-8a1a-6ff2997da3a6")
            this.gattCharacteristic = await gattService.getCharacteristic("ebe0ccc1-7a0a-4b0c-8a1a-6ff2997da3a6")
            await this.gattCharacteristic.startNotifications();	
            
            this.emitValues(await this.gattCharacteristic.readValue())
            
            this.gattCharacteristic.on('valuechanged', buffer => {
                this.emitValues(buffer)
            })
        } catch(error){
            throw new Error(`unable to connect to device LYWSD03MMC:${error.message}}`)
        }
        return this
    }
    async disconnect(){
        super.disconnect()
        if (this.gattCharacteristic /*&& await this.gattCharacteristic.isNotifying()*/) {
            console.log('stopping notifications')
            await this.gattCharacteristic.stopNotifications()
            console.log('notifications stopped')
            this.gattCharacteristic=null
        }
        if (await this.device.isConnected()){
            console.log('disconnecting device')
               await this.device.disconnect()
               console.log('device disconnected')

        }
    }
}
module.exports=LYWSD03MMC