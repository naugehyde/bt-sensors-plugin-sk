const BTSensor = require("../BTSensor");

class SmartShunt_GATT extends BTSensor{
    
    static needsScannerOn(){
        return false
    } 
    static data = new Map()
                    .set('current',{unit:'A', description: 'Current house amperage', 
                        gatt: '6597ed8c-4bda-4c1e-af4b-551c4cf74769',
                        read: (buff)=>{return buff.readInt32LE()/1000}})
                   .set('power',{unit:'W', description: 'Current house wattage',
                        gatt: '6597ed8e-4bda-4c1e-af4b-551c4cf74769',
                        read: (buff)=>{return buff.readInt16LE()}})
                    .set('voltage',{unit:'V', description: 'House battery voltage', 
                        gatt: '6597ed8d-4bda-4c1e-af4b-551c4cf74769',
                        read: (buff)=>{return buff.readInt16LE()/100}})
                    .set('starterVoltage',{unit:'V', description: 'Starter battery voltage', 
                        gatt: '6597ed7d-4bda-4c1e-af4b-551c4cf74769',
                        read: (buff)=>{return buff.readInt16LE()/100}})
                    .set('consumed',{unit:'', description: 'The sensor\'s battery voltage', 
                        gatt: '6597eeff-4bda-4c1e-af4b-551c4cf74769',
                        read: (buff)=>{return buff.readInt32LE()/10}})
                    .set('soc',{unit:'', description: 'State of Charge', 
                        gatt: '65970fff-4bda-4c1e-af4b-551c4cf74769',
                        read: (buff)=>{return buff.readUInt16LE()/10000}})    
                    .set('ttg',{unit:'s', description: 'Time to go', 
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
        this.constructor.data.forEach(async (datum, id)=> {
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