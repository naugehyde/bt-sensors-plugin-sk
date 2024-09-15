const EventEmitter = require('node:events');

/**
 * @classdesc Abstract class that all sensor classes should inherit from. Sensor subclasses monitor a 
 * BT peripheral and emit changes in the sensors's value like "temp" or "humidity"
 * @class BTSensor
 * @see EventEmitter, node-ble/Device
 */
class BTSensor {

    constructor(device,params=null) {
        this.device=device
        this.eventEmitter = new EventEmitter();
    }
/**
 * tells plugin if the class needs to keep the scanner running.
 * defaults to [true]. 
 * If any loaded instance of a sensor needs the scanner, it stays on for all.
 * @static 
 * @returns boolean 
 */
    static needsScannerOn(){
        return true
    } 

    static events() {
        throw new Error("events() static function must be implemented by subclass")
    }

    static metadataTags() {
        return this.getMetadata().keys()
    }
    
    static hasMetaData(id) {
        return this.getMetadata().has(id)
    }

    static unitFor(id){
        return this.getMetadata().get(id)?.unit
    }
    
    static getMetadata(){
        return this.metadata
    }
    
    static getInstantiationParameters(){
        return new Map(
            [...this.getMetadata().entries()].filter(([key,value]) => value?.isParam??false)
          )
    }

    init(){

    }
    getMetadata(){
        return this.constructor.getMetadata()
    }


    async getDisplayName(){
        return `${await this.device.getNameSafe()} (${await this.getMacAddress()})`
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