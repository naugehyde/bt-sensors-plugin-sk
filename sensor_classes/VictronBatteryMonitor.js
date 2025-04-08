/**
  
 */

const VictronSensor = require("./Victron/VictronSensor.js");
const VC=require("./Victron/VictronConstants.js")
const int24 = require('int24')
class VictronBatteryMonitor extends VictronSensor{


    static async identify(device){
        return await this.identifyMode(device, 0x02)
    }
    static _test(data, key){
        var b = Buffer.from(data.replaceAll(" ",""),"hex")
        const d = new this()

        if (key) {
            d.encryptionKey = key
        
        }
        d.currentProperties = {}
        d.currentProperties.ManufacturerData={}
        d.currentProperties.ManufacturerData[0x02e1]=b
        d.initMetadata() 
        Object.keys(d.getPaths()).forEach((tag)=>{
                d.on(tag,(v)=>console.log(`${tag}=${v}`))
        })
        b = d.decrypt(b)
        console.log(b)
        d.emitValuesFrom(b)
        d.removeAllListeners()
    
    }

    characteristics=[]
    async init(){
        await super.init()
        this.initMetadata()
    }

    initMetadata(){
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
        if (this.encryptionKey){
            const decData = this.decrypt(this.getManufacturerData(0x02e1))
            if (decData)
                this.auxMode=decData.readInt8(8)&0x3   
        }

        switch(this.auxMode){
            case VC.AuxMode.STARTER_VOLTAGE:
                this.addMetadatum('starterVoltage','V', 'starter battery voltage', 
                    (buff,offset=0)=>{return buff.readInt16LE(offset)/100},
                    '6597ed7d-4bda-4c1e-af4b-551c4cf74769')
                break;
            case VC.AuxMode.MIDPOINT_VOLTAGE:
                this.addMetadatum('midpointVoltage','V', 'midpoint battery voltage', 
                    (buff,offset=0)=>{return buff.readUInt16LE(offset)/100},
                    '6597ed7d-4bda-4c1e-af4b-551c4cf74769')
                break;

            case VC.AuxMode.TEMPERATURE:
                this.addMetadatum('temperature','K', 'House battery temperature', 
                    (buff,offset=0)=>{return (buff.readUInt16LE(offset)/100)},
                    '6597ed7d-4bda-4c1e-af4b-551c4cf74769')
                break;
            default:
                break
        }
    }
    
    emitValuesFrom(decData){
        this.emitData("ttg",decData,0)
        this.emitData("voltage",decData,2);
        const alarm = this.getPath("alarm").read(decData,4)
        if (alarm>0){
            this.emit(
                `ALARM #${alarm} from ${this.getDisplayName()})`, 
                { message: VC.AlarmReason.get(alarm), state: 'alert'})
        }
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
        this.emit("current", (this.NaNif(int24.readInt24LE(decData,  8)>>2,0x1FFFFF))/1000)  
        this.emit("consumed",(this.NaNif(int24.readInt24LE(decData, 11)&0xFFFFF,0xFFFFF)) / 10) ; 
        this.emit("soc", this.NaNif(((decData.readUInt16LE(13)& 0x3FFF)>>4),0x3FF)/1000)
        
    }
    
    initGATTConnection() {
        return new Promise((resolve,reject )=>{
            if (!this.valueIfVariant(this.currentProperties.Paired))
                reject(`${this.getName()} must be paired with the Signalk server to use GATT protocol`)
            this.device.connect().then(async ()=>{
                this.debug(`${this.getName()} connected.`)
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
        Object.keys(this.getPaths()).forEach( (tag)=> {
            const datum = getPath(tag)
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
        Object.keys(this.getPaths()).forEach( (tag)=> {
            const datum = getPath(tag)
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

    hasGATT(){
        return true
    }
    
    getGATTDescription(){
        return "To use the GATT connection the SignalK server computer and the Smart Shunt must first be paired."
    }

    async stopListening(){
        super.stopListening()
        for (var c of this.characteristics){
            await c.stopNotifications()
        }
        if (await this.device.isConnected()){
            await this.device.disconnect()
            this.debug(`Disconnected from ${ this.getName()}`)
        }
    }
}
module.exports=VictronBatteryMonitor