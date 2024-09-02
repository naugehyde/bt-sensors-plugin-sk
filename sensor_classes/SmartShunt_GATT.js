const BTSensor = require("../BTSensor");

class SmartShunt_GATT extends BTSensor{
    
    static needsScannerOn(){
        return false
    } 
    static metadata = new Map()
                    .set('current',{unit:'A', description: 'house battery amperage', 
                        gatt: '6597ed8c-4bda-4c1e-af4b-551c4cf74769',
                        read: (buff)=>{return buff.readInt32LE()/1000}})
                   .set('power',{unit:'W', description: 'house battery wattage',
                        gatt: '6597ed8e-4bda-4c1e-af4b-551c4cf74769',
                        read: (buff)=>{return buff.readInt16LE()}})
                    .set('voltage',{unit:'V', description: 'house battery voltage', 
                        gatt: '6597ed8d-4bda-4c1e-af4b-551c4cf74769',
                        read: (buff)=>{return buff.readInt16LE()/100}})
                    .set('starterVoltage',{unit:'V', description: 'starter battery voltage', 
                        gatt: '6597ed7d-4bda-4c1e-af4b-551c4cf74769',
                        read: (buff)=>{return buff.readInt16LE()/100}})
                    .set('consumed',{unit:'', description: 'amp-hours consumed', 
                        gatt: '6597eeff-4bda-4c1e-af4b-551c4cf74769',
                        read: (buff)=>{return buff.readInt32LE()/10}})
                    .set('soc',{unit:'', description: 'state of charge', 
                        gatt: '65970fff-4bda-4c1e-af4b-551c4cf74769',
                        read: (buff)=>{return buff.readUInt16LE()/10000}})    
                    .set('ttg',{unit:'s', description: 'time to go', 
                        gatt: '65970ffe-4bda-4c1e-af4b-551c4cf74769',
                        read: (buff)=>{return buff.readUInt16LE()*60}})    

    
    constructor(device){
        super(device)
    }

   
    async connect() {
        //TBD implement async version with error-checking
        await this.device.connect()
        const gattServer = await this.device.gatt()
		const gattService = await gattServer.getPrimaryService("65970000-4bda-4c1e-af4b-551c4cf74769")
        const keepAlive =await gattService.getCharacteristic('6597ffff-4bda-4c1e-af4b-551c4cf74769')
	    await keepAlive.writeValue(Buffer.from([0xFF,0xFF]), { offset: 0, type: 'request' })
        this.constructor.metadata.forEach(async (datum, id)=> {
            const c = await gattService.getCharacteristic(datum.gatt)
            c.readValue().then( buffer =>
                this.emit(id, datum.read(buffer))
            )
            c.startNotifications();	
            c.on('valuechanged', buffer => {
                this.emit(id, datum.read(buffer))
            })
        });

    }
    async disconnect(){
        super.disconnect()
        await this.device.disconnect()
    }
}
module.exports=SmartShunt_GATT