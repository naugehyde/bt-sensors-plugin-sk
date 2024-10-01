const { Variant } = require('dbus-next');
const { log } = require('node:console');
const EventEmitter = require('node:events');

/**
 * @classdesc Abstract class that all sensor classes should inherit from. Sensor subclasses monitor a 
 * BT peripheral and emit changes in the sensors's value like "temp" or "humidity"
 * @class BTSensor
 * @see EventEmitter, node-ble/Device
 */
class BTSensor {
    static metadata=new Map()
    constructor(device,params=null) {
        this.device=device
        this.eventEmitter = new EventEmitter();
        this.Metadatum = this.constructor.Metadatum
        this.metadata = new Map(this.constructor.metadata)
    }

    static Metadatum = 
        class Metadatum{
        
            constructor(tag, unit, description, 
                read=()=>{return null}, gatt=null, type){
                this.tag = tag
                this.unit = unit
                this.description = description
                this.read = read
                this.gatt = gatt
                this.type = type //schema type e.g. 'number'
           } 
            asJSONSchema(){
                return {type:this?.type??'string', title: this.description}
            }
        }  

    static getMetadata(){
        return this.metadata
    }
    static {
        this.addMetadatum("RSSI","db","Signal strength in db")
    }
    static addMetadatum(tag, ...args){
        var metadatum = new this.Metadatum(tag, ...args)
        this.getMetadata().set(tag,metadatum)
        return metadatum
    }

    emitData(tag, buffer, ...args){
        this.emit(tag, this.getMetadatum(tag).read(buffer, ...args))
    }

    async emitGattData(tag, gattService, gattCharacteristic=null, ...args) {
        const datum = this.getMetadatum(tag)
        if (gattCharacteristic==null)
            gattCharacteristic = await gattService.getCharacteristic(datum.gatt)

        gattCharacteristic.readValue().then( buffer =>
            this.emitData(tag, buffer, ...args)
        )
        return gattCharacteristic
    }

    static getInstantiationParameters(){
        return new Map(
            [...this.getMetadata().entries()].filter(([key,value]) => value?.isParam??false)
          )
    }

    static strangeIntFromBuff(buffer, startBit, length) {
        return parseInt(toBinaryString(buffer.slice(startBit,startBit+length),2))
    }


    static toBinaryString(buff){
        return [...buff].map((b) => b.toString(2).padStart(8, "0")).join("");
    }

    async init(){
        this.currentProperties=await this.device.helper.props()
    }
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

    getSignalStrength(){
        const rssi =  this.getRSSI()
        if (!rssi) return 0
        return 150-(5/3*(Math.abs(rssi)))
    }

     getBars(){
        const ss =  this.getSignalStrength()
        var bars = ""
      
        if (ss>=10)
            bars+= '\u{2582} ' //;"▂ "
        if (ss>=35) 
            bars+= "\u{2584} " 
        if (ss>=60)
            bars+= "\u{2586} " 
        if (ss > 85) 
            bars+= "\u{2588}"
        return bars 

    }

     getName(){
        return this.currentProperties.Name
    }
     getDisplayName(){
        return `${ this.getName()} (${ this.getMacAddress()}) ${ this.getBars()}`
    }

     getMacAddress(){
        return this.currentProperties.Address
    }
    getRSSI(){
        return this.currentProperties.RSSI
    }
 
    valueIfVariant(obj){
        if (obj.constructor && obj.constructor.name=='Variant') 
            return obj.value
        else
            return obj
        
    }
/**
 * callback function on device properties changing
 */
    async propertiesChanged(props){
            
        if (props.RSSI) {
            this.currentProperties.RSSI=this.valueIfVariant(props.RSSI)
            this.emit("RSSI", this.currentProperties.RSSI)
        }
        if (props.ServiceData)
            this.currentProperties.ServiceData=this.valueIfVariant(props.ServiceData)

        if (props.ManufacturerData)
            this.currentProperties.ManufacturerData=this.valueIfVariant(props.ManufacturerData)

    }
   
  /**
   *  Connect to sensor.
   *  This is where the logic for connecting to sensor, listening for changes in values and emitting those values go
   */
    getServiceData(key){
        if (this.currentProperties.ServiceData)
            return this.valueIfVariant (this.currentProperties.ServiceData[key])
        else
            return null

    }
    getManufacturerData(key){
        if (this.currentProperties.ManufacturerData)
            return this.valueIfVariant (this.currentProperties.ManufacturerData[key])
        else
            return null
    }
    
    async connect(){
        this.propertiesChanged.bind(this)
        this.propertiesChanged(this.currentProperties)
        this.device.helper.on("PropertiesChanged",
        ((props)=> {
            this.propertiesChanged(props)
        }))
        return this
        //throw new Error("connect() member function must be implemented by subclass")
    }
  /**
   *  Discconnect from sensor.
   *  Implemented by subclass if additional behavior necessary (like disconnect from device's GattServer etc.)
   */

    disconnect(){
        this.eventEmitter.removeAllListeners()
        this.device.helper.removeListener(this, this.propertiesChanged)
    }

   /**
   *  Convenience method for emitting value changes.
   *  Just passes on(eventName, ...args) through to EventEmitter instance
   */


    on(eventName, ...args){
        this.eventEmitter.on(eventName, ...args)
    }
    emit(eventName, value){
        this.eventEmitter.emit(eventName,value);
    }
    emitValuesFrom(buffer){
        this.getMetadata().forEach((datum, tag)=>{
            if (!(datum.isParam||datum.notify) && datum.read)
            this.emit(tag, datum.read(buffer))
        })
    }
}

module.exports = BTSensor   