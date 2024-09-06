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

    constructor(device){
        super(device)
    }

    emitValues(buffer){
        this.emit("temp",((buffer.readInt16LE(0))/100) + 273.1);
        this.emit("humidity",buffer.readUInt8(2)/100);
        this.emit("voltage",buffer.readUInt16LE(3)/1000);
    }

    async connect() {
        await this.device.connect()
        var gattServer = deawait this.device.gatt()
        var gattService = await gattServer.getPrimaryService("ebe0ccb0-7a0a-4b0c-8a1a-6ff2997da3a6")
        this.gattCharacteristic = await gattService.getCharacteristic("ebe0ccc1-7a0a-4b0c-8a1a-6ff2997da3a6")
        await gattCharacteristic.startNotifications();	
        this.emitValues(await gattCharacteristic.readValue())
        gattCharacteristic.on('valuechanged', buffer => {
            this.emitValues(buffer)
        })
    }
    async disconnect(){
        super.disconnect()
        await this.gattCharacteristic.stopNotifications()
        await this.device.disconnect()
    }
}
module.exports=LYWSD03MMC