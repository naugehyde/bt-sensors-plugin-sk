const VictronSensor = require("./Victron/VictronSensor.js");
const VC=require("./Victron/VictronConstants.js")
class VictronBatteryMonitor extends VictronSensor{
    static {
        this.metadata = new Map(super.getMetadata())
        this.addMetadatum('current', 'A', 'house battery amperage', 
                (buff,offset=0)=>{return buff.readInt32LE(offset)/1000},
                '6597ed8c-4bda-4c1e-af4b-551c4cf74769')
        this.addMetadatum('power','W', 'house battery wattage',
                (buff,offset=0)=>{return buff.readInt16LE(offset)},
                '6597ed8e-4bda-4c1e-af4b-551c4cf74769')
        this.addMetadatum('voltage','V',  'house battery voltage', 
                (buff,offset=0)=>{return this.NaNif(buff.readInt16LE(offset), 0x7FFF)/100},
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
                (buff,offset=0)=>{return this.NaNif(buff.readUInt16LE(offset),0xFFFF)*60},
                '65970ffe-4bda-4c1e-af4b-551c4cf74769')    
    }

    static async identify(device){
        return await this.identifyMode(device, 0x02)
    }

    characteristics=[]
    async init(){
        await super.init()
        const modecurrent = this.getAuxModeAndCurrent()
        this.auxMode= modecurrent.auxMode
        switch(this.auxMode){
            case VC.AuxMode.STARTER_VOLTAGE:
                this.addMetadatum('starterVoltage','V', 'starter battery voltage', 
                    (buff,offset=0)=>{return buff.readInt16LE(offset)/100},
                    '6597ed7d-4bda-4c1e-af4b-551c4cf74769')
                break;
            case VC.AuxMode.MIDPOINT_VOLTAGE:
                this.addMetadatum('midpointVoltage','V', 'midpoint battery voltage', 
                    (buff,offset=0)=>{return buff.readInt16LE(offset)/100},
                    '6597ed7d-4bda-4c1e-af4b-551c4cf74769')
                break;

            case VC.AuxMode.TEMPERATURE:
                this.addMetadatum('temperature','K', 'House battery temperature', 
                    (buff,offset=0)=>{return buff.readInt16LE(offset)/100},
                    '6597ed7d-4bda-4c1e-af4b-551c4cf74769')
                break;
            default:
                break
        }
    }

    emitValuesFrom(decData){
        this.emitData("ttg",decData,0)
        this.emitData("voltage",decData,2);
        const alarm = this.getMetadatum("alarm").read(decData,4)
        if (alarm>0){
            this.emit(
                `ALARM #${alarm} from ${this.getDisplayName()})`, 
                { message: AlarmReason.get(alarm), state: 'alert'})
        }
        
        this.emit("current", (this.getAuxModeAndCurrent(8,decData)).current)
        switch(this.auxMode){
        case VC.AuxMode.STARTER_VOLTAGE:
            this.emitData("starterVoltage",decData,6);
            break;
        case VC.AuxMode.MIDPOINT_VOLTAGE:
            this.emitData("midpointVoltage",decData,6);
            break;
        case VC.AuxMode.TEMPERATURE:
            this.emitData("temperature",decData,6);
            break;
        default:
            break
        }      
        this.emit("consumed",decData.readInt16LE(11) / 10 ); //TODO this ain't right
        var soc = decData.readUInt16LE(13)
        this.emit("soc", ((soc & 0x3FFF) >> 4) / 1000)
    }
    
    initGATT() {
        return new Promise((resolve,reject )=>{
            if (!this.valueIfVariant(this.currentProperties.Paired))
                reject(`${this.getName()} must be paired with the Signalk server to use GATT protocol`)
            this.device.connect().then(async ()=>{
                if (!this.gattServer) {
                    this.gattServer = await this.device.gatt()
                    this.gattService= await this.gattServer.getPrimaryService("65970000-4bda-4c1e-af4b-551c4cf74769")
                    const keepAlive = await this.gattService.getCharacteristic('6597ffff-4bda-4c1e-af4b-551c4cf74769')
                    await keepAlive.writeValue(Buffer.from([0xFF,0xFF]), { offset: 0, type: 'request' })
                }
                resolve(this)
            }).catch((e)=>reject(e.message))
        })
    }
    emitGATT(){
        this.getPathMetadata().forEach( (datum, tag)=> {
            if (datum.gatt) {
            this.gattService.getCharacteristic(datum.gatt).then((gattCharacteristic)=>{
                gattCharacteristic.readValue().then((buffer)=>{
                    this.emitData(tag, buffer)
                })
            }).catch((e)=>{
                throw new Error(e)
            })}
        })
    }
    initGATTNotifications(){
        return new Promise((resolve,reject )=>{

        this.getPathMetadata().forEach((datum, tag)=> {
            if (datum.gatt) {
            this.gattService.getCharacteristic(datum.gatt).then(async (gattCharacteristic)=>{
                const buffer = await gattCharacteristic.readValue()
                this.emitData(tag, buffer)
                
                gattCharacteristic.startNotifications().then(()=>{
                    gattCharacteristic.on('valuechanged', buffer => {
                        this.emitData(tag, buffer)
                    })
                    this.characteristics.push(gattCharacteristic)
                })
            })
        }})
        resolve(this)})
    }
    propertiesChanged(props){
        super.propertiesChanged(props)
    }
    canUseGATT(){
        return true
    }
    
    getGATTDescription(){
        return "To use the GATT connection the SignalK server computer and the Smart Shunt must first be paired."
    }

    async disconnect(){
        super.disconnect()
        for (var c of this.characteristics){
            await c.stopNotifications()
        }
        if (await this.device.isConnected()){
            console.log(`Disconnecting from ${ this.getMacAddress()}`)
            await this.device.disconnect()
        }
    }
}
module.exports=VictronBatteryMonitor