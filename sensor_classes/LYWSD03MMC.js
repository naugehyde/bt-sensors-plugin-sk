const BTSensor = require("../BTSensor");

class LYWSD03MMC extends BTSensor{

    static needsScannerOn(){
        return false
    }
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
    static metadata = new Map()
                    .set('temp',{unit:'K', description: 'temperature'})
                    .set('humidity',{unit:'ratio', description: 'humidity'})
                    .set('voltage',{unit:'V', description: 'sensor battery voltage'})

    constructor(device,params){
        super(device, params)
    }

    emitValues(buffer){
        this.emit("temp",((buffer.readInt16LE(0))/100) + 273.1);
        this.emit("humidity",buffer.readUInt8(2)/100);
        this.emit("voltage",buffer.readUInt16LE(3)/1000);
    }

    async connect() {
        try{
            console.log(`${this.constructor.name} connecting`)
            //await this.device.connect()
            await this.device.helper.callMethod('Connect')
            console.log(`${this.constructor.name} connected`)
            var gattServer = await this.device.gatt()
            console.log(`${this.constructor.name} got gatt server`)
            var gattService = await gattServer.getPrimaryService("ebe0ccb0-7a0a-4b0c-8a1a-6ff2997da3a6")
            console.log(`${this.constructor.name} got gatt service`)
            this.gattCharacteristic = await gattService.getCharacteristic("ebe0ccc1-7a0a-4b0c-8a1a-6ff2997da3a6")
            console.log(`${this.constructor.name} got gatt characteristic`)
            await this.gattCharacteristic.startNotifications();	
            console.log(`${this.constructor.name} started notifications`)

            this.emitValues(await this.gattCharacteristic.readValue())
            console.log(`${this.constructor.name} read value`)

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