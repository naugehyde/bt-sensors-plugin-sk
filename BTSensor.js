const { Variant } = require('dbus-next');
const { log } = require('node:console');
const EventEmitter = require('node:events');
const BTCompanies = require('./bt_co.json')
/**
 * @classdesc Abstract class that all sensor classes should inherit from. Sensor subclasses monitor a 
 * BT peripheral and emit changes in the sensors's value like "temp" or "humidity"
 * @class BTSensor
 * @see EventEmitter, node-ble/Device
 */

const BTCompanyMap=new Map()

BTCompanies.company_identifiers.forEach( (v) =>{
    BTCompanyMap.set(v.value, v.name)
})

/**
 * https://www.intuitibits.com/2016/03/23/dbm-to-percent-conversion/
 */

function signalQualityPercentQuad(rssi, perfect_rssi=-20, worst_rssi=-85) {
    const nominal_rssi=(perfect_rssi - worst_rssi);
    var signal_quality =
    (100 *
    (perfect_rssi - worst_rssi) *
    (perfect_rssi - worst_rssi) -
    (perfect_rssi - rssi) *
    (15 * (perfect_rssi - worst_rssi) + 62 * (perfect_rssi - rssi))) / 
    ((perfect_rssi - worst_rssi) * (perfect_rssi - worst_rssi));
    
    if (signal_quality > 100) {
        signal_quality = 100;
    } else if (signal_quality < 1) {
        signal_quality = 0;
    }
    return Math.ceil(signal_quality);
}

class BTSensor extends EventEmitter {
    static metadata=new Map()
    constructor(device, config={}, gattConfig={}) {
        super()
  
        this.device=device
        this.name = config?.name
  
        this.useGATT = gattConfig?.useGATT
        this.pollFreq = gattConfig?.pollFreq
        
        this.Metadatum = this.constructor.Metadatum
        this.metadata = new Map(this.constructor.metadata)
    }
    static _test(data, key){
        var b = Buffer.from(data.replaceAll(" ",""),"hex")
        const d = new this()
        d.getPathMetadata().forEach((datum,tag)=>{
                d.on(tag,(v)=>console.log(`${tag}=${v}`))
        })
        if (key) {
            d.encryptionKey = key
            b = d.decrypt(b)
            console.log(b)
        }
        d.emitValuesFrom(b)
        d.removeAllListeners()
    
    }
    static Metadatum = 
        class Metadatum{
        
            constructor(tag, unit, description, 
                read=()=>{
                    return null
                }, gatt=null, type){
                this.tag = tag
                this.unit = unit
                this.description = description
                this.read = read
                this.gatt = gatt
                this.type = type //schema type e.g. 'number'
           } 
            asJSONSchema(){
                return {
                    type:this?.type??'string', 
                    title: this?.description,
                    unit: this?.unit,
                    default: this?.default
                }
            }
        }  

  
        static async getPropsProxy(device){
        
            if (!device._propsProxy) {
                const objectProxy  = await device.helper.dbus.getProxyObject(device.helper.service, device.helper.object)
                device._propsProxy = await objectProxy.getInterface('org.freedesktop.DBus.Properties')
            }
            return device._propsProxy 
        }
        static async getDeviceProps(device, propNames=[]){
            const _propsProxy = await this.getPropsProxy(device)
            const rawProps = await _propsProxy.GetAll(device.helper.iface)
            const props = {}
            for (const propKey in rawProps) {
                if (propNames.length==0 || propNames.indexOf(propKey)>=0)
                    props[propKey] = rawProps[propKey].value
            }
            return props
        }
        static async getDeviceProp(device, prop){
            const _propsProxy = await this.getPropsProxy(device)
            try{
                const rawProps = await _propsProxy.Get(device.helper.iface,prop)
                return rawProps?.value
            }
            catch(e){
                return null //Property $prop (probably) doesn't exist in $device
            }
        }  
        
    
    static async getManufacturerID(device){
        const md = await this.getDeviceProp(device,'ManufacturerData')
        if (!md) return null 
        const keys = Object.keys(md)
        if (keys && keys.length>0){
            return parseInt(keys[0])
        }
        return null
    }
    static NaNif(v1,v2) {  return (v1==v2)?NaN:v1 }
    
    async init(){
        var md = this.addMetadatum("name", "string","Name of sensor" )
        md.isParam=true
        this.currentProperties = await this.constructor.getDeviceProps(this.device)
        this.addMetadatum("RSSI","db","Signal strength in db")
        this.getMetadatum("RSSI").default=`sensors.${this.getMacAddress().replaceAll(':', '')}.rssi`
        this.getMetadatum("RSSI").read=()=>{return this.getRSSI()}
        this.getMetadatum("RSSI").read.bind(this)
        if (this.hasGATT()) {
            md = this.addMetadatum("useGATT", "boolean", "Use GATT connection")
            md.type="boolean"
            md.isParam=true
            md.isGATT=true

            md = this.addMetadatum("pollFreq", "s", "Polling frequency in seconds")
            md.type="number"
            md.isParam=true
            md.isGATT=true
        }
    }
    
    NaNif(v1,v2) {  return this.constructor.NaNif(v1,v2) }

    addMetadatum(tag, ...args){
        var metadatum = new this.Metadatum(tag, ...args)
        this.getMetadata().set(tag, metadatum)
        return metadatum
    }

    getMetadata(){
        if (this.metadata==undefined)
            this.metadata= new Map(this.constructor.getMetadata())
        return this.metadata
    }
    getMetadatum(tag){
        return this.getMetadata().get(tag)
    }

    getPathMetadata(){
        return new Map(
            [...this.getMetadata().entries()].filter(([key,value]) => !(value?.isParam??false))
        )
    }
    getParamMetadata(){
        return new Map(
            [...this.getMetadata().entries()].filter(([key,value]) => (value?.isParam??false) && !(value?.isGATT??false))
        )
    }
    getGATTParamMetadata(){
        return new Map(
            [...this.getMetadata().entries()].filter(([key,value]) => (value?.isParam??false) && (value?.isGATT??false))
        )
    }
    getGATTDescription() {
        return ""
    }
    getSignalStrength(){
        const rssi =  this.getRSSI()
        if (!rssi) 
            return NaN
        return signalQualityPercentQuad(rssi)
    }

    getBars(){
        const ss =  this.getSignalStrength()
        var bars = ""
      
        if (ss>0)
            bars+= '\u{2582} ' //;"▂ "
        if (ss>=30) 
            bars+= "\u{2584} " 
        if (ss>=60)
            bars+= "\u{2586} " 
        if (ss > 80) 
            bars+= "\u{2588}"
        return bars 

    }


    getDescription(){
        return `${this.getName()} from ${this.getManufacturer()}`
    }
    getName(){
        return this?.name??this.currentProperties.Name
    }

    getNameAndAddress(){
        return `${this.getName()} at ${this.getMacAddress()}`
    }
     getDisplayName(){
        return `${ this.getName()} (${ this.getMacAddress()} RSSI: ${this.getRSSI()} db / ${this.getSignalStrength().toFixed()}%) ${ this.getBars()}`
    }

    getMacAddress(){
        return this.currentProperties.Address
    }
    getRSSI(){
        return this.currentProperties?.RSSI??NaN
    }
    hasGATT(){
        return false
    }
    usingGATT(){
        return this.useGATT
    }
    valueIfVariant(obj){
        if (obj.constructor && obj.constructor.name=='Variant') 
            return obj.value
        else
            return obj
        
    }
    emitData(tag, buffer, ...args){
        this.emit(tag, this.getMetadatum(tag).read(buffer, ...args))
    }

/**
 * callback function on device properties changing
 */
    propertiesChanged(props){
            
        if (props.RSSI) {
            this.currentProperties.RSSI=this.valueIfVariant(props.RSSI)
            this.emit("RSSI", this.currentProperties.RSSI)
        }
        if (props.ServiceData)
            this.currentProperties.ServiceData=this.valueIfVariant(props.ServiceData)

        if (props.ManufacturerData)
            this.currentProperties.ManufacturerData=this.valueIfVariant(props.ManufacturerData)

    }

    getServiceData(key){
        if (this.currentProperties.ServiceData)
            return this.valueIfVariant (this.currentProperties.ServiceData[key])
        else
            return null

    }

    getManufacturerID(){
        const md = this.currentProperties.ManufacturerData
        if (md){
            const keys = Object.keys(this.valueIfVariant(md))
            if (keys.length>0)
                return parseInt(keys[0])
        }
        return null
    }
    
    getManufacturer(){
        const id = this.getManufacturerID()
        return (id==null)?"Unknown manufacturer":BTCompanyMap.get(parseInt(id))
    }

    getManufacturerData(key=null){
        if (this.currentProperties.ManufacturerData)
            if (key)
                return this.valueIfVariant (this.currentProperties.ManufacturerData[key])
            else
                return(this.valueIfVariant (this.currentProperties.ManufacturerData))                
        else
            return null
    }
    
    initGATTInterval(){
        this.device.disconnect().then(()=>{
            this.initPropertiesChanged()
            this.intervalID = setInterval( () => {
                this.initGATTConnection().then(()=>{
                    this.emitGATT()
                    this.device.disconnect()
                        .then(()=>
                            this.initPropertiesChanged()
                        )
                        .catch((e)=>{
                            this.debug(`Error disconnecting from ${this.getName()}: ${e.message}`)
                        })
                })
                .catch((error)=>{
                    this.debug(error)
                    throw new Error(`unable to emit values for device ${this.getName()}:${error}`)
                })
            }
            , this.pollFreq*1000)
        })
    }
     initPropertiesChanged(){

        this.propertiesChanged.bind(this)
        this.device.helper._prepare()
        this.device.helper.on("PropertiesChanged",
        ((props)=> {
            this.propertiesChanged(props)
        }))
     }
  /**
   *  Listen to sensor.
   *  This is where the logic for listening for changes in values and emitting those values go
   */
    listen(){
        this.initPropertiesChanged()       
        this.propertiesChanged(this.currentProperties)
        if (this.usingGATT()){
            this.initGATTConnection().then(async ()=>{
                this.emitGATT()
                if (this.pollFreq){
                    this.initGATTInterval()
                }
                else 
                    await this.initGATTNotifications()
            })
            .catch((e)=>this.debug(`GATT services unavailable for ${this.getName()}. Reason: ${e}`))
        }
        return this
    }
  /**
   *  Stop Listening to sensor.
   *  Implemented by subclass if additional behavior necessary (like disconnect() from device's GattServer etc.)
   */

    stopListening(){
        this.removeAllListeners()
        this.device.helper.removeListeners()
        if (this.intervalID){
            clearInterval(this.intervalID)
        }    
    }

    emitValuesFrom(buffer){
        this.getMetadata().forEach((datum, tag)=>{
            if (!(datum.isParam||datum.notify) && datum.read)
            this.emit(tag, datum.read(buffer))
        })
    }
}

module.exports = BTSensor   