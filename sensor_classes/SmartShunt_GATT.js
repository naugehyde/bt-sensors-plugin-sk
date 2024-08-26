const BTSensor = require("../BTSensor");

class SmartShunt_GATT extends BTSensor{
    
    static needsScannerOn(){
        return false
    } 
    constructor(device){
        super(device)
    }

    emitValue(id, buff){
        var v 
        switch (id) {
            case ('current'):
                v= buff.readInt32LE()/1000;                
                break;
            case ('power'):
                v =buff.readInt16LE();
                break;
            case ('voltage'):
                v = buff.readInt16LE()/100;
                break;
            case ('starterVoltage'):
                v = buff.readUInt16LE()/100;
                break;
            case ('consumed'):
                v = buff.readInt32LE()/10;
                break;
            case ('soc'):
                v = buff.readUInt16LE()/10000;
                break;
            case ('ttg'):
                v = buff.readUInt16LE()*60;           
                break;
            default:
                break;
        }
        this.eventEmitter.emit(id,v);
    }

    async connect() {
        //TBD implement async version with error-checking
        await this.device.connect()
        const gattServer = await this.device.gatt()
		const gattService = await gattServer.getPrimaryService("65970000-4bda-4c1e-af4b-551c4cf74769")
        const keepAlive =await gattService.getCharacteristic('6597ffff-4bda-4c1e-af4b-551c4cf74769')
	    await keepAlive.writeValue(Buffer.from([0xFF,0xFF]), { offset: 0, type: 'request' })
        var cMap = new Map()
        cMap.set('current', await gattService.getCharacteristic('6597ed8c-4bda-4c1e-af4b-551c4cf74769'))
        cMap.set('power', await gattService.getCharacteristic('6597ed8e-4bda-4c1e-af4b-551c4cf74769'))
        cMap.set('voltage', await gattService.getCharacteristic('6597ed8d-4bda-4c1e-af4b-551c4cf74769'))
        cMap.set('starterVoltage', await gattService.getCharacteristic('6597ed7d-4bda-4c1e-af4b-551c4cf74769'))
        cMap.set('consumed', await gattService.getCharacteristic('6597eeff-4bda-4c1e-af4b-551c4cf74769'))
        cMap.set('soc', await gattService.getCharacteristic('65970fff-4bda-4c1e-af4b-551c4cf74769'))
        cMap.set('ttg', await gattService.getCharacteristic('65970ffe-4bda-4c1e-af4b-551c4cf74769'))

        cMap.forEach((c, id)=> {
            
            c.readValue().then( v =>
                this.emitValue(id, v)
            )
            c.startNotifications();	
            c.on('valuechanged', buffer => {
                this.emitValue(id,buffer)
            })});

    }
    async disconnect(){
        super.disconnect()
        this.device.disconnect()
    }
}
module.exports=SmartShunt_GATT