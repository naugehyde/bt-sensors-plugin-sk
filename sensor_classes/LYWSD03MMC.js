const BTSensor = require("../BTSensor");

class LYWSD03MMC extends BTSensor{

    static needsScannerOn(){
        return false
    }
    static data = new Map()
                    .set('temp',{unit:'K', description: 'Current temperature'})
                    .set('humidity',{unit:'ratio', description: 'Current humidity'})
                    .set('voltage',{unit:'V', description: 'The sensor\'s battery voltage'})

    constructor(device){
        super(device)
    }

    emitValues(buffer){
        this.emit("temp",((buffer.readInt16LE(0))/100) + 273.1);
        this.emit("humidity",buffer.readUInt8(2)/100);
        this.emit("voltage",buffer.readUInt16LE(3)/1000);
    }

    async connect() {
        //TBD implement async version with error-checking
        await this.device.connect()
        var gattServer = await this.device.gatt()
        var gattService = await gattServer.getPrimaryService("ebe0ccb0-7a0a-4b0c-8a1a-6ff2997da3a6")
        var gattCharacteristic = await gattService.getCharacteristic("ebe0ccc1-7a0a-4b0c-8a1a-6ff2997da3a6")
        this.emitValues(await gattCharacteristic.readValue())
        await gattCharacteristic.startNotifications();	
        gattCharacteristic.on('valuechanged', buffer => {
            this.emitValues(buffer)
        })
    }
    async disconnect(){
        super.disconnect()
        await this.device.disconnect()
    }
}
module.exports=LYWSD03MMC