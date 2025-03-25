const { Variant } = require('dbus-next');
const { log } = require('node:console');
const EventEmitter = require('node:events');

/** 
 * @author Andrew Gerngross <oh.that.andy@gmail.com>
*/

/**
 * {@link module:node-ble}
 */

const BTCompanies = require('./bt_co.json')
/**
 * @global A map of company names keyed by their Bluetooth ID
 * {@link ./sensor_classes/bt_co.json} file derived from bluetooth-sig source:
 * {@link https://bitbucket.org/bluetooth-SIG/public/src/main/assigned_numbers/company_identifiers/company_identifiers.yaml}
 */

const BTCompanyMap=new Map()

BTCompanies.company_identifiers.forEach( (v) =>{
    BTCompanyMap.set(v.value, v.name)
})

/**
 * @function signalQualityPercentQuad
 * 
 * Utility to convert RSSI (Bluetooth radio strength signal) 
 * decibel values to a linear percentage 
 * 
 * See {@link  https://www.intuitibits.com/2016/03/23/dbm-to-percent-conversion/ }
 * 
 * 
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

/**
 * @classdesc Class that all sensor classes should inherit from. Sensor subclasses 
 * monitor a BT peripheral and emit changes in the sensors's value like "temp" or "humidity"
 * @class BTSensor
 * @abstract
 * @extends EventEmitter
 * 
 * @requires module:node-ble/Device
 * @requires module:node-ble/BusHelper
 * 
 */

class BTSensor extends EventEmitter {
    static metadata=new Map()

    /**
     * 
     * @param {module:node-ble/Device} device 
     * @param {*} config 
     * @param {*} gattConfig 
     */
    constructor(device, config={}, gattConfig={}) {
        super()
  
        this.device=device
        this.name = config?.name
  
        this.useGATT = gattConfig?.useGATT
        this.pollFreq = gattConfig?.pollFreq
        
        this.Metadatum = this.constructor.Metadatum
        this.metadata = new Map()
    }
    /**
     * @function _test Test sensor parsing
     * 
     * @example
     * 
     * 1) from a command line execute:
     *      bluetoothctl scan on
     * 
     * 2) from the command line execute:
     *      bluetoothctl devices
     *    until you see your device
     * 
     * 3) from the command line execute: 
     *      bluetoothctl info [your device's mac address]
     * 
     * 4) copy the sensor's Manufacturer Data or Service Data (whichever advertises your sensor's values)
     * 
     * 5) format the string of data so it's just the hex value separated by a space
     * 
     * 6) from the command line execute:
     *      node
     * 
     * 7) from the node prompt execute: 
     *      const MySensorClass = require('./path_to_my_sensor_class/MySensorClass')
     * 
     * 8) from the node prompt execute:
     *      const myData = <string of data you captured and formatted>
     *      const optionalDecryptionKey = <the encryption key for your sensor>
     *      MySensorClass._test(myData,optionalDecryptionKey)
     * 
     * You should see your data parsed and formated on the console
     * If you don't, it's possible your sensor is doing its parsing in the 
     * BTSensor::propertiesChanged function or the encryption key is invalid.
     * 
     * Errors will occur if the data string is incomplete
     * 
     * Unusual values are likely to appear if the data string is encrypted 
     * and you didn't provide a decryption key 
     * 
     * @static 
     * @param {string} data string formatted as "AE FF 45..." which is more or less how Bluetoothctl presents it
     * @param {string|null} key encryption key (optional)
     * 
     */
    static _test(data, key, config={}){
        var b = Buffer.from(data.replaceAll(" ",""),"hex")
        const d = new this(null,config)
        d.initMetadata() 
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
    /**
     * @class encapsulates a sensor's metadata 
     * @todo refactor and/or just plain rethink constructor parameters
     */
        class Metadatum{
        
            constructor(tag, unit, description, read, gatt=null, type){
                this.tag = tag
                this.unit = unit
                this.description = description
                this.read = read
                this.gatt = gatt
                this.type = type //schema type e.g. 'number'
           } 
           /**
            * 
            * @returns A JSON object passed by plugin to the plugin's schema 
            *          dynamically updated at runtime upon discovery and interrogation
            *          of the device
            */
            asJSONSchema(){
                return {
                    type:this?.type??'string', 
                    title: this?.description,
                    unit: this?.unit,
                    enum: this?.enum,
                    default: this?.default
                }
            }
        }  

    //static utility Functions
    /**
     * 
     * @param {*} v1 
     * @param {*} v2 
     * @returns NaN if v1 equals v2 otherwise, v1
     */
    static NaNif(v1,v2) {  return (v1==v2)?NaN:v1 }
    
    
    /**
     * 
     * Following three functions are direct to DBUS functions to get 
     * around node-ble's not always reliable and not always persistent 
     * property get methods
     * 
     * Subclasses do not need to call these functions
     * except in static ::identify(device) functions
     * 
     * ::_getPropsProxy(device) need never be called by any subclass
     * 
     * Instances do not to call these functions at all. 
     * Instance device property gets are handled by the BTSensor class implementation
     * 
     * @todo duplicate and derive a better {@link module:node-ble}
     * 
     */        
    static async _getPropsProxy(device){
    
        if (!device._propsProxy) {
            const objectProxy  = await device.helper.dbus.getProxyObject(device.helper.service, device.helper.object)
            device._propsProxy = await objectProxy.getInterface('org.freedesktop.DBus.Properties')
        }
        return device._propsProxy 
    }

    static async getDeviceProps(device, propNames=[]){
        const _propsProxy = await this._getPropsProxy(device)
        const rawProps = await _propsProxy.GetAll(device.helper.iface)
        const props = {}
        for (const propKey in rawProps) {
            if (propNames.length==0 || propNames.indexOf(propKey)>=0)
                props[propKey] = rawProps[propKey].value
        }
        return props
    }
    static async getDeviceProp(device, prop){
        const _propsProxy = await this._getPropsProxy(device)
        try{
            const rawProps = await _propsProxy.Get(device.helper.iface,prop)
            return rawProps?.value 
        }
        catch(e){
            return null //Property $prop (probably) doesn't exist in $device
        }
    }  
    //End static utitity functions
    
        
    
    //static identity functions

    static identify(device){
        throw new Error("BTSensor is an abstract class. ::identify must be implemented by the subclass")
    }

    /**
     * getManufacturerID is used to help ID the manufacturer of a device
     * 
     * NOTE: Not all devices advertise their ManufacturerID in their ManufacturerData key
     * 
     * @param {Device} device 
     * @returns the numeric ID of a device's manufacturer iff the device
     *          advertises ManufacturerData otherwise, null
     * 
     */
    static async getManufacturerID(device){
        const md = await this.getDeviceProp(device,'ManufacturerData')
        if (!md) return null 
        const keys = Object.keys(md)
        if (keys && keys.length>0){
            return parseInt(keys[keys.length-1])
        }
        return null
    }

    //END static identity functions

    //Instance Initialization functions
    /**
     * 
     * init() initializes the sensor adding metadata as appropriate
     * as well as initializing any other instance-specific values
     * subclasses must call await super.init()
     *  
     */

    async init(){
        //create the 'name' parameter
        var md = this.addMetadatum("name", "string","Name of sensor" )
        md.isParam=true
        //create the 'RSSI' parameter 
        this.currentProperties = await this.constructor.getDeviceProps(this.device)
        this.addMetadatum("RSSI","db","Signal strength in db")
        this.getMetadatum("RSSI").default=`sensors.${this.getMacAddress().replaceAll(':', '')}.rssi`
        this.getMetadatum("RSSI").read=()=>{return this.getRSSI()}
        this.getMetadatum("RSSI").read.bind(this)
        //create GATT params (iff sensor is GATT-ish)
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

    /**
     * Add a metadatum instance to the sensor instance
     *  
     * @param {String} tag 
     * @param  {...any} args 
     * @returns {this.Metadatum} the new metadatum instance
     */

    addMetadatum(tag, ...args){
        var metadatum = new this.Metadatum(tag, ...args)
        this.getMetadata().set(tag, metadatum)
        return metadatum
    }

    //GATT Initialization functions
    /**
    * Subclasses providing GATT support should override this method  
    * 
    * initGATTFunction is where subclasses are expected to connect to their devices and
    * make any GATTServer and GATTCharacteristic connections necessary
    * 
    * see: VictronBatteryMonitor for an example
    */ 

    initGATTConnection(){
        throw new Error("::initGATTConnection() should be implemented by the BTSensor subclass")
    }
    /**
    * Subclasses providing GATT support should override this method  
    * 
    * initGATTNotifications() is where subclasses are expected setup listeners to their
    * GATTCharacteristics and emit values when received
    * 
    * see: VictronBatteryMonitor for an example
    */ 
    initGATTNotifications(){
        throw new Error("::initGATTNotifications() should be implemented by the BTSensor subclass")
    }

    /**
     * 
     * Subclasses do NOT need to override this function
     * This function is only called when the property pollFreq is set to > 0
     * The function calls #emitGATT() at the specified interval then disconnects
     * from the device. 
     */

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

    /**
     * ::propertiesChanged() is a callback function invoked when the device's properties change
     * 
     * NOTE: The function mucks about with node-ble internal functions to help make sure the
     * DBUS connection stays alive, doesn't tax resources and doesn't spit out spurious errors.
     */
    initPropertiesChanged(){

        this.propertiesChanged.bind(this)
        this.device.helper._prepare()
        this.device.helper.on("PropertiesChanged",
            ((props)=> {
                try{
                    this.propertiesChanged(props)
                }
                catch(error){
                    this.debug(`Error occured on ${this.getNameAndAddress()}: ${error?.message??error}`)
                    this.debug(error)
                }
            }))
     }
    //END instance initialization functions

    //Metadata functions
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
    //End metadata functions

    //Sensor description functions

    getMacAddress(){
        return this.currentProperties.Address
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
    //END sensor description functions


    //Device property functions
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
    //END Device property functions

    //Sensor RSSI state functions
    
    getRSSI(){
        return this.currentProperties?.RSSI??NaN
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

    //End Sensor RSSI state functions
    
    //Sensor GATT state functions

    hasGATT(){
        return false
    }
    usingGATT(){
        return this.useGATT
    }
    getGATTDescription() {
        return ""
    }
    //END Sensor GATT state functions

    //Sensor listen-to-changes functions
   
    /**
     * callback function on a device's properties changing
     * BTSensor subclasses should override this function but call super.propertiesChanged(props) first
     * This function stores the latest broadcast RSSI ServiceData and ManufacturerData in the
     * currentproperties instance variable eliminating the need to make async calls to DBUS for same.
     * 
     * @param {*} props which contains ManufacturerData and ServiceData (where the sensor's data resides)
     * set up by BTSensor::initPropertiesChanged()
     */
    propertiesChanged(props){
            
        if (props.RSSI) {
            this.currentProperties.RSSI=this.valueIfVariant(props.RSSI)
            this.emit("RSSI", this.currentProperties.RSSI) //tell any RSSI listeners of the new value
        }
        if (props.ServiceData)
            this.currentProperties.ServiceData=this.valueIfVariant(props.ServiceData) 

        if (props.ManufacturerData)
            this.currentProperties.ManufacturerData=this.valueIfVariant(props.ManufacturerData)

    }

   /**
   * 
   */

    emitGATT(){
        throw new Error("Subclass must implement ::emitGATT function")
    }

    emitData(tag, buffer, ...args){
        this.emit(tag, this.getMetadatum(tag).read(buffer, ...args))
    }

    emitValuesFrom(buffer){
        this.getMetadata().forEach((datum, tag)=>{
            if (!(datum.isParam||datum.notify) && datum.read)
            this.emit(tag, datum.read(buffer))
        })
    }

  /**
   *  Listen to sensor.
   *  ::listen() sets up listeners for property changes thru ::propertiesChanged(props)
   *  If GATT connections are available and active, function inits the GATT connection and 
   *  optional GATT connection interval
   */


    listen(){
        try{
            this.initPropertiesChanged()       
            this.propertiesChanged(this.currentProperties)
        } catch(e){
            this.debug(e)
        }
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
   * 
   *  Called automatically by Plugin::plugin.stop()
   */

    stopListening(){
        this.removeAllListeners()
        this.device.helper.removeListeners()
        if (this.intervalID){
            clearInterval(this.intervalID)
        }    
    }
    //END Sensor listen-to-changes functions
    
    //Instance utility functions

    NaNif(v1,v2) {  return this.constructor.NaNif(v1,v2) }

    valueIfVariant(obj){
        if (obj?.constructor && obj.constructor.name=='Variant') 
            return obj.value
        else
            return obj
        
    }
    //End instance utility functions

     createPaths(config, id){
		this.getMetadata().forEach((metadatum, tag)=>{
			if ((!(metadatum?.isParam)??false)){ //param metadata is passed to the sensor at 
												 //create time through the constructor, and isn't a
												 //a value you want to see in a path 
				
				const path = config.paths[tag]
				if (!(path===undefined))
					this.app.handleMessage(id, 
					{
					updates: 
						[{ meta: [{path: path, value: { units: metadatum?.unit }}]}]
					})
			}
			})
	}

	 initPaths(deviceConfig, id){
		this.getMetadata().forEach((metadatum, tag)=>{
			const path = deviceConfig.paths[tag];
			if (!(path === undefined)) {
                this.app.debug(`${tag} => ${path}` )
                this.on(tag, (val)=>{
					if (metadatum.notify){
						this.app.notify(tag, val, id )
					} else {
						this.updatePath(path,val,id)
					}
                })
			}
		})
	}
	 updatePath(path, val,id){
		this.app.handleMessage(id, {updates: [ { values: [ {path: path, value: val }] } ] })
  	}  
}

module.exports = BTSensor   