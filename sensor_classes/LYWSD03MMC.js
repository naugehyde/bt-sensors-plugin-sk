const BTSensor = require("../BTSensor");

class LYWSD03MMC extends BTSensor{

    constructor(device){
        super(device)
    }

    emitValues(buffer){
        this.eventEmitter.emit("temp",((buffer.readInt16LE(0))/100) + 273.1);
        this.eventEmitter.emit("humidity",buffer.readUInt8(2)/100);
        this.eventEmitter.emit("voltage",buffer.readUInt16LE(3)/1000);
    }

    async connect() {
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
        this.device.disconnect()
    }
}
module.exports=LYWSD03MMC