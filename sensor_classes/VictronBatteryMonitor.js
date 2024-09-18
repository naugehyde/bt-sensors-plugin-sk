const BTSensor = require("../BTSensor");
const _Victron = require("./_Victron");


class VictronBatteryMonitor extends _Victron{
    static {
        this.metadata = new Map(super.getMetadata())
        this.addMetadatum('current', 'A', 'house battery amperage', 
                (buff,offset=0)=>{return buff.readInt32LE(offset)/1000},
                '6597ed8c-4bda-4c1e-af4b-551c4cf74769')
        this.addMetadatum('power','W', 'house battery wattage',
                (buff,offset=0)=>{return buff.readInt16LE(offset)},
                '6597ed8e-4bda-4c1e-af4b-551c4cf74769')
        this.addMetadatum('voltage','V',  'house battery voltage', 
                (buff,offset=0)=>{return buff.readInt16LE(offset)/100},
                '6597ed8d-4bda-4c1e-af4b-551c4cf74769',)
        const alarmMD = this.addMetadatum('alarm','',  'alarm', 
                (buff,offset=0)=>{return buff.readInt16LE(offset)})
                alarmMD.notify=true

        this.addMetadatum( 'consumed','C', 'amp-hours consumed', 
                (buff,offset=0)=>{return buff.readInt32LE(offset)/10},
                '6597eeff-4bda-4c1e-af4b-551c4cf74769',)

        this.addMetadatum( 'soc','ratio', 'state of charge', 
                (buff,offset=0)=>{return buff.readUInt16LE(offset)/10000},
                '65970fff-4bda-4c1e-af4b-551c4cf74769')    

        this.addMetadatum( 'ttg','s','time to go', 
                (buff,offset=0)=>{return buff.readUInt16LE(offset)*60},
                '65970ffe-4bda-4c1e-af4b-551c4cf74769')    
    }
    static async identify(device){

        try{
            const isVictron = (super.identify(device)!=null)
            if (!isVictron) return null
            if (await this.getMode(device)==0x02)
                return this

        } catch (e){
            console.log(e)
            return null
        }
        return null
    }
    characteristics=[]
    auxMode = -1
    async init(){
        super.init()
        const modecurrent = await this.getAuxModeAndCurrent()
        this.auxMode= modecurrent.auxMode
        switch(this.auxMode){
            case this.constructor.AuxMode.STARTER_VOLTAGE:
                this.addMetadatum('starterVoltage','V', 'starter battery voltage', 
                    (buff,offset=0)=>{return buff.readInt16LE(offset)/100},
                    '6597ed7d-4bda-4c1e-af4b-551c4cf74769')
                break;
            case this.constructor.AuxMode.MIDPOINT_VOLTAGE:
                this.addMetadatum('midpointVoltage','V', 'midpoint battery voltage', 
                    (buff,offset=0)=>{return buff.readInt16LE(offset)/100},
                    '6597ed7d-4bda-4c1e-af4b-551c4cf74769')
                break;

            case this.constructor.AuxMode.TEMPERATURE:
                this.addMetadatum('temperature','K', 'House battery temperature', 
                    (buff,offset=0)=>{return buff.readInt16LE(offset)/100},
                    '6597ed7d-4bda-4c1e-af4b-551c4cf74769')
                break;
            default:
                break
        }
    }

    async emitValuesFrom(decData){
        this.emitData("ttg",decData,0)
        this.emitData("voltage",decData,2);
        const alarm = this.getMetadatum("alarm").read(decData,4)
        if (alarm>0){
            this.emit(
                `ALARM #${alarm} from ${this.getDisplayName()})`, 
                { message: AlarmReason.get(alarm), state: 'alert'})
        }
        
        this.emit("current", (await this.getAuxModeAndCurrent(8,decData)).current)
        switch(this.auxMode){
        case this.constructor.AuxMode.STARTER_VOLTAGE:
            this.emitData("starterVoltage",decData,6);
            break;
        case this.constructor.AuxMode.MIDPOINT_VOLTAGE:
            this.emitData("midpointVoltage",decData,6);
            break;
        case this.constructor.AuxMode.TEMPERATURE:
            this.emitData("temperature",decData,6);
            break;
        default:
            break
        }      
        this.emit("consumed",decData.readInt16LE(11) / 10 );
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
                const c = await this.emitGattData(datum.tag, gattService) 
                await c.startNotifications();	
                c.on('valuechanged', buffer => {
                    this.emitGattData(datum.tag, null, c)
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