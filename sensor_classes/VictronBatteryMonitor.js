/**
  
 */

const VictronSensor = require("./Victron/VictronSensor.js");
const VC=require("./Victron/VictronConstants.js")
const int24 = require('int24')
class VictronBatteryMonitor extends VictronSensor{

        static _test(data, key){
        var b
        if (data instanceof String)
            b = Buffer.from(data.replaceAll(" ",""),"hex")
        else
            b = data
        const d = new this()

        if (key) {
            d.encryptionKey = key       
        } else
            d.auxMode=b.readInt8(8)&0x3
        d.currentProperties = {}
        d.currentProperties.ManufacturerData={}
        d.currentProperties.ManufacturerData[0x02e1]=b
        d.debug = (m)=>{console.log(m)}
        d.debug.bind(d)
        d.initSchema()
        Object.keys(d.getPaths()).forEach((tag)=>{
                d.on(tag,(v)=>console.log(`${tag}=${JSON.stringify(v)}`))
        })
        if (key)
            b = d.decrypt(b)
        else

        console.log(b)
        d.emitValuesFrom(b)
        d.removeAllListeners()
    
    }
    static ImageFile = "VictronSmartShunt.jpg"

    characteristics=[]

    async initSchema(){
        await super.initSchema()
        this.addDefaultParam("batteryID").default="house"
        //"default": "electrical.batteries.{batteryID}.voltage"

        this.addDefaultPath('current','electrical.batteries.current')
            .read=(buff,offset=0)=>{return buff.readInt32LE(offset)/1000}
        this.getPath("current").gatt='6597ed8c-4bda-4c1e-af4b-551c4cf74769'

        this.addMetadatum('power','W', 'house battery wattage',
                (buff,offset=0)=>{return buff.readInt16LE(offset)},
                '6597ed8e-4bda-4c1e-af4b-551c4cf74769')
            .default="electrical.batteries.{batteryID}.power"

        this.addDefaultPath('voltage', "electrical.batteries.voltage")
            .read=(buff,offset=0)=>{return this.NaNif(buff.readInt16LE(offset), 0x7FFF)/100}
        this.getPath("voltage").gatt='6597ed8d-4bda-4c1e-af4b-551c4cf74769'
        
        const alarmMD = this.addMetadatum('alarm','',  'alarm', 
                (buff,offset=0)=>{return buff.readInt16LE(offset)})
                alarmMD.default='electrical.batteries.{batteryID}.alarm'                

        this.addMetadatum( 'consumed','Ah', 'amp-hours consumed', 
                (buff,offset=0)=>{return buff.readInt32LE(offset)/10},
                '6597eeff-4bda-4c1e-af4b-551c4cf74769',)
            .default="electrical.batteries.{batteryID}.capacity.ampHoursConsumed"

        this.addDefaultPath( 'soc',"electrical.batteries.capacity.stateOfCharge") 
            .read=(buff,offset=0)=>{return buff.readUInt16LE(offset)/10000}
        this.getPath("soc").gatt='65970fff-4bda-4c1e-af4b-551c4cf74769'

        
        this.addDefaultPath( 'ttg',"electrical.batteries.capacity.timeRemaining") 
            .read=(buff,offset=0)=>{return this.NaNif(buff.readUInt16LE(offset),0xFFFF)*60}
        this.getPath("ttg").gatt='65970ffe-4bda-4c1e-af4b-551c4cf74769';

        if (this.auxMode==undefined){
            const md=await this.constructor.getDataPacket(this.device, this.getManufacturerData(this.constructor.ManufacturerID))
            try {
                if (this.encryptionKey){
                    const decData = this.decrypt(md)
                    if (decData)
                        this.auxMode=decData.readInt8(8)&0x3   
            }
            } catch(e){ 
                this.debug(`Unable to determine device AuxMode. ${e.message}`)
                this._app.debug(e)
                this.auxMode=VC.AuxMode.DISABLED
            }
        }
    
        switch(this.auxMode){
            case VC.AuxMode.STARTER_VOLTAGE:
                this.addMetadatum('starterVoltage','V', 'starter battery voltage', 
                    (buff,offset=0)=>{return buff.readInt16LE(offset)/100},
                    '6597ed7d-4bda-4c1e-af4b-551c4cf74769')
                    .default="electrical.batteries.starter.voltage"
                    break;
            case VC.AuxMode.MIDPOINT_VOLTAGE:
                this.addMetadatum('midpointVoltage','V', 'midpoint battery voltage', 
                    (buff,offset=0)=>{return buff.readUInt16LE(offset)/100},
                    '6597ed7d-4bda-4c1e-af4b-551c4cf74769')
                    .default="electrical.batteries.midpoint.voltage"
                break;

            case VC.AuxMode.TEMPERATURE:
                
                this.addDefaultPath('temperature','electrical.batteries.temperature')
                    .read=(buff,offset=0)=>{return (buff.readUInt16LE(offset)/100)}
                    this.getPath('temperature').gatt='6597ed7d-4bda-4c1e-af4b-551c4cf74769'
                break;
            default:
                break
        }
                
    }
  
    emitValuesFrom(decData){
        
        this.emitData("ttg",decData,0)
        this.emitData("voltage",decData,2);
        const alarm = this.getPath("alarm").read(decData,4)
        if (alarm>0)
            this.emitAlarm("alarm",alarm)
        
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
            this.deviceConnect().then(async ()=>{
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
            const datum = this.getPaths()[tag]
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
            const datum = this.getPaths()[tag]
            if (datum.gatt) {
                this.gattService.getCharacteristic(datum.gatt).then(async (gattCharacteristic)=>{
                //const buffer = await gattCharacteristic.readValue()
                //this.emitData(tag, buffer)
                
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

    getDescription(){
        return `${super.getDescription()}.<p><p>After setting the encryption key, Save and reselect to configure the value of the Aux field (Secondary Battery, Midpoint or Battery Temperature)`
    }

    async stopListening(){
        super.stopListening()
        for (var c of this.characteristics){
            await c.stopNotifications()
        }
        if (await this.device.isConnected()){
            await this.device.disconnect()
            this.debug(`Disconnected`)
        }
    }
    
}
module.exports=VictronBatteryMonitor