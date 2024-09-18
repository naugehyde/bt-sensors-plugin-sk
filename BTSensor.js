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
                read=()=>{return null}, gatt=null){
                this.tag = tag
                this.unit = unit
                this.description = description
                this.read = read
                this.gatt = gatt
           } 

        }  

    static getMetadata(){
        return this.metadata
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
            this.emitData(id, buffer, ...args)
        )
        return gattCharacteristic
    }

    static getInstantiationParameters(){
        return new Map(
            [...this.getMetadata().entries()].filter(([key,value]) => value?.isParam??false)
          )
    }

    init(){

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

    async getSignalStrength(){
        const rssi = await this.device.getProp("RSSI")
        if (!rssi) return 0
        return 150-(5/3*(Math.abs(rssi)))
    }

    async getBars(){
        const ss = await this.getSignalStrength()
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

    async getName(){
        return await this.device.getNameSafe()
    }
    async getDisplayName(){
        return `${await this.getName()} (${await this.getMacAddress()}) ${await this.getBars()}`
    }

    async getMacAddress(){
        return this.device.getAddress()
    }
  /**
   *  Connect to sensor.
   *  This is where the logic for connecting to sensor, listening for changes in values and emitting those values go
   * @throws Error if unimplemented by subclass
   */

    connect(){
        throw new Error("connect() member function must be implemented by subclass")
    }
  /**
   *  Discconnect from sensor.
   *  Implemented by subclass if additional behavior necessary (like disconnect from device's GattServer etc.)
   */

    disconnect(){
        this.eventEmitter.removeAllListeners()
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

}

module.exports = BTSensor   