const BTSensor = require("../BTSensor");
const int24 = require('int24')
const _Victron = require("./_Victron");

 const AuxMode={
    STARTER_VOLTAGE: 0,
    MIDPOINT_VOLTAGE: 1,
    TEMPERATURE: 2,
    DISABLED: 3
 }
class VictronBatteryMonitor extends _Victron{
    static async identify(device){

        try{
            const isVictron = (super.identify(device)!=null)
            if (!isVictron) return null
            
            const md = await device.getProp('ManufacturerData')
            if (!md) return null   
            const data = md[0x2e1]
            if (data && data.value.readUInt8(4)==0x02)
                return this

        } catch (e){
            console.log(e)
            return null
        }
        return null
    }
    static metadata = new Map(super.metadata.entries())
                    .set('current',{unit:'A', description: 'house battery amperage', 
                        gatt: '6597ed8c-4bda-4c1e-af4b-551c4cf74769',
                        read: (buff,offset=0)=>{return buff.readInt32LE(offset)/1000}})
                   .set('power',{unit:'W', description: 'house battery wattage',
                        gatt: '6597ed8e-4bda-4c1e-af4b-551c4cf74769',
                        read: (buff,offset=0)=>{return buff.readInt16LE(offset)}})
                    .set('voltage',{unit:'V', description: 'house battery voltage', 
                        gatt: '6597ed8d-4bda-4c1e-af4b-551c4cf74769',
                        read: (buff,offset=0)=>{return buff.readInt16LE(offset)/100}})
                    .set('alarm',{unit:'', description: 'alarm', notify: true, 
                        //gatt: 'not supported',
                        read: (buff,offset=0)=>{return buff.readInt16LE(offset)}})
                    .set('consumed',{unit:'C', description: 'amp-hours consumed', 
                        gatt: '6597eeff-4bda-4c1e-af4b-551c4cf74769',
                        read: (buff,offset=0)=>{return buff.readInt32LE(offset)/10}})
                    .set('soc',{unit:'ratio', description: 'state of charge', 
                        gatt: '65970fff-4bda-4c1e-af4b-551c4cf74769',
                        read: (buff,offset=0)=>{return buff.readUInt16LE(offset)/10000}})    
                    .set('ttg',{unit:'s', description: 'time to go', 
                        gatt: '65970ffe-4bda-4c1e-af4b-551c4cf74769',
                        read: (buff,offset=0)=>{return buff.readUInt16LE(offset)*60}})    

    characteristics=[]
    auxMode = -1
    async init(){
        super.init()
        const md = await this.device.getProp('ManufacturerData')
        if (!md) throw Error("Unable to get Manufacturer data")
        if (this.advertisementKey) {
            const decData=this.decrypt(md[0x2e1].value)
            var current = int24.readInt24LE(decData,8)
            this.auxMode = current & 0b11
            switch(this.auxMode){
                case AuxMode.STARTER_VOLTAGE:
                    this.constructor.metadata.set('starterVoltage',{unit:'V', description: 'starter battery voltage', 
                            gatt: '6597ed7d-4bda-4c1e-af4b-551c4cf74769',
                            read: (buff,offset=0)=>{return buff.readInt16LE(offset)/100}})
                            break;
                case AuxMode.MIDPOINT_VOLTAGE:
                    this.constructor.metadata.set('midpointVoltage',{unit:'V', description: 'midpoint battery voltage', 
                        gatt: '6597ed7d-4bda-4c1e-af4b-551c4cf74769',
                        read: (buff,offset=0)=>{return buff.readUInt16LE(offset)/100}})
                        break;

                case AuxMode.TEMPERATURE:
                    this.constructor.metadata.set('temperature',{unit:'K', description: 'House battery temperature', 
                        gatt: '6597ed7d-4bda-4c1e-af4b-551c4cf74769',
                        read: (buff,offset=0)=>{return buff.readUInt16LE(offset)/100}})
                        break;
                default:
                    break
                }
        }

    }

    emitValuesFrom(decData){
        this.emit("ttg",this.getMetadata().get("ttg").read(decData,0))
        this.emit("voltage",this.getMetadata().get("voltage").read(decData,2));
        const alarm = this.getMetadata().get("alarm").read(decData,4)
        if (alarm>0){
            this.emit(
                `ALARM #${alarm} from ${this.getDisplayName()})`, 
                { message: alarmReason(alarm), state: 'alert'})
        }
        
        var current = int24.readInt24LE(decData,8)
        this.emit("current", current>>2)/1000
        switch(this.auxMode){
        case AuxMode.STARTER_VOLTAGE:
            this.emit("starterVoltage",this.getMetadata().get("starterVoltage").read(decData,6));
            break;
        case AuxMode.MIDPOINT_VOLTAGE:
            this.emit("midpointVoltage",this.getMetadata().get("midpointVoltage").read(decData,6));
            break;
        case AuxMode.TEMPERATURE:
            this.emit("temperature",this.getMetadata().get("tempurature").read(decData,6));
            break;
        default:
            break
        }      
        this.emit("consumed",decData.readUInt16LE(11));
        var soc = decData.readUInt16LE(13)
        this.emit("soc", ((soc & 0x3FFF) >> 4) / 1000)
    }
    
    async gatt_connect() {
        const paired = await this.device.isPaired()
        if (!paired) 
            throw new Error( this.device.toString() + " must be paired to use GATT.")
        await this.device.connect()
        const gattServer = await this.device.gatt()
		const gattService = await gattServer.getPrimaryService("65970000-4bda-4c1e-af4b-551c4cf74769")
        const keepAlive =await gattService.getCharacteristic('6597ffff-4bda-4c1e-af4b-551c4cf74769')
	    await keepAlive.writeValue(Buffer.from([0xFF,0xFF]), { offset: 0, type: 'request' })
        this.getMetadata().forEach(async (datum, id)=> {
            if ((!(datum?.isParam)??false) && (datum.gatt)){ 
                const c = await gattService.getCharacteristic(datum.gatt)
                c.readValue().then( buffer =>
                    this.emit(id, datum.read(buffer))
                )
                await c.startNotifications();	
                c.on('valuechanged', buffer => {
                    this.emit(id, datum.read(buffer))
                })
                this.characteristics.push(c)
            } 
        });
        return this

    }
    async disconnect(){
        super.disconnect()
        for (var c of this.characteristics){
            await c.stopNotifications()
        }
        if (await this.device.isConnected()){
            console.log(`Disconnecting from ${await this.device.getAddress()}`)
            await this.device.disconnect()
        }
    }
}
module.exports=VictronBatteryMonitor