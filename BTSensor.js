const { Variant } = require('dbus-next');
const { log } = require('node:console');
const EventEmitter = require('node:events');
var {exec} = require('child_process');

/** 
 * @author Andrew Gerngross <oh.that.andy@gmail.com>
*/

/**
 * {@link module:node-ble}
 */

const BTCompanies = require('./bt_co.json');

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
function preparePath(obj, str) {
    const regex = /\{([^}]+)\}/g;
    let match;
    let resultString = "";
    let lastIndex = 0;
  
    while ((match = regex.exec(str)) !== null) {
      const fullMatch = match[0];
      const keyToAccess = match[1].trim();
  
      // Append the text before the current curly braces
      resultString += str.substring(lastIndex, match.index);
      lastIndex = regex.lastIndex;
  
      try {
        let evalResult = obj[keyToAccess];
        if (typeof evalResult === 'function'){
            evalResult= evalResult.call(obj)
        }

        resultString += evalResult !== undefined ? evalResult : `${keyToAccess}_value_undefined`;
      } catch (error) {
        console.error(`Error accessing key '${keyToAccess}':`, error);
        resultString += fullMatch; // Keep the original curly braces on error
      }
    }
  
    // Append any remaining text after the last curly braces
    resultString += str.substring(lastIndex);
  
    return resultString || str; // Return original string if no replacements were made
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
    //static metadata=new Map()
    static DEFAULTS = require('./plugin_defaults.json');
    
    /**
     * 
     * @param {module:node-ble/Device} device 
     * @param {*} config 
     * @param {*} gattConfig 
     */
    constructor(device, config={}, gattConfig={}) {
        super()
  
        this.device=device

        Object.assign(this,config)
        Object.assign(this,gattConfig)
    
        this._state = null
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
        Object.keys(d.getPaths()).forEach((tag)=>{
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

    initSchema(){
        this._schema = {
            properties:{
                active: {title: "Active", type: "boolean", default: true },
                discoveryTimeout: {title: "Device discovery timeout (in seconds)", 
                    type: "integer", default:30,
                    minimum: 10,
                    maximum: 600 },
            
                params:{
                    title:`Device parameters`,
                    description: this.getDescription(),
                    type:"object",
                    properties:{}
                },
                paths:{
                    title:"Signalk Paths",
                    description: `Signalk paths to be updated when ${this.getName()}'s values change`,
                    type:"object",
                    properties:{}
                }
            }
        }

		if (this.hasGATT()){

			this._schema.properties.gattParams={
				title:`GATT Specific device parameters`,
				description: this.getGATTDescription(),
				type:"object",
				properties:{
                    useGATT: {title: "Use GATT connection", type: "boolean", default: false },
                    pollFreq: { type: "number", title: "Polling frequency in seconds"}
                }
			}
		}

    }
    async init(){
        this.currentProperties = await this.constructor.getDeviceProps(this.device)
        this.initSchema()


        //create the 'name' parameter
        this.addDefaultParam("name")

        //create the 'location' parameter

        this.addDefaultParam("location")

        //create the 'RSSI' parameter 
        this.addDefaultPath("RSSI","sensors.RSSI")
        this.getPath("RSSI").read=()=>{return this.getRSSI()}
        this.getPath("RSSI").read.bind(this)
        this.initListen()
    }

    initListen(){
        Promise.resolve(this.listen())
    }
    activate(config, plugin){
        if (config.paths){
            this.createPaths(config,plugin.id)
            this.initPaths(config,plugin.id)
            this.debug(`Paths activated for ${this.getDisplayName()}`);
        }
        if (this.usingGATT()){
            try {
            this.activateGATT()
            } catch (e) {
                this.debug(`GATT services unavailable for ${this.getName()}. Reason: ${e}`)
                this._state="ERROR"
                return
            }
        }
        this._state="ACTIVE"
    }

    activateGATT(){
        this.initGATTConnection().then(async ()=>{
            this.emitGATT()
            if (this.pollFreq){
                this.initGATTInterval()
            }
            else 
                await this.initGATTNotifications()
        })
    }

    /**
     * Add a metadatum instance to the sensor instance
     *  
     * @param {String} tag 
     * @param  {...any} args 
     * @returns {this.Metadatum} the new metadatum instance
     */

    addMetadatum(tag, ...args){

        const md = {}
        if (args[0]) md.unit = args[0]
        if (args[1]) md.title = args[1]
        if (args[2]) md.read = args[2]
        if (args[3]) md.gatt = args[3]
        if (args[4]) md.type = args[4]
     
        return this.addPath(tag,md)
    }

    addParameter(tag, param){

        if (!param.type)
            param.type="string"

        this._schema.properties.params.properties[tag]=param
        return this._schema.properties.params.properties[tag]
    }

    addPath(tag, path){
        if (!path.type)
            path.type="string"

        if (!path.pattern)
            path.pattern="^(?:[^{}\\s]*\\{[a-zA-Z0-9]+\\}[^{}\\s]*|[^{}\\s]*)$"
        this._schema.properties.paths.properties[tag]=path
        return this._schema.properties.paths.properties[tag]
    }
   
    addGATTParameter(tag, param){

        if (!param.type)
            param.type="string"
        
        return this._schema.properties.gattParams.properties[tag]=param
    }

    addDefaultPath(tag,defaultPath){
        const path = eval(`BTSensor.DEFAULTS.${defaultPath}`)
        return this.addPath(tag,Object.assign({}, path))
    }

    addDefaultParam(tag){        
        return this.addParameter(tag,Object.assign({}, BTSensor.DEFAULTS.params[tag]))
    }

    getJSONSchema(){
        return this._schema
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

    async deviceConnect() {
        await this.device.connect()
        /* CAUTION: HACK AHEAD 

        Bluez for some cockamamie reason (It's 2025 for chrissake. 
        BLUETOOTH ISN'T JUST FOR DESKTOPS ANYMORE, BLUEZ DEVS!)
        SUSPENDS scanning while connected to a device.

        The next line of code gives the scanner a kick in the arse, 
        starting it up again so, I dunno, another device might be able 
        to connect and sensor classes could maybe get beacon updates.

        You know, the little things.
      */
        try {
            exec('bluetoothctl scan on &',
                function (error, stdout, stderr) {
                    console.log('stdout: ' + stdout);
                    if (error !== null) {
                         console.log('exec error: ' + error);
                    }
                });
        } catch (e){
            //probably ignorable
            console.log(e)
        }
        /* END HACK*/
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

        this._propertiesChanged.bind(this)
        this.device.helper._prepare()
        this.device.helper.on("PropertiesChanged",
            ((props)=> {
                try{
                    this._propertiesChanged(props)
                }
                catch(error){
                    this.debug(`Error occured on ${this.getNameAndAddress()}: ${error?.message??error}`)
                    this.debug(error)
                }
            }))
     }
    //END instance initialization functions

    //Metadata functions

    getPath(tag){
        return this._schema.properties.paths.properties[tag]
    }

    getPaths(){
        return this._schema.properties.paths.properties
    }
    getParams(){
        return this._schema.properties.params.properties
    }
    getGATTParams(){
        return this._schema.properties.gattParams.properties
       
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
        const name = this?.name??this.currentProperties.Name
        return name?name:"Unknown"

    }
    macAndName(){
        return `${this.getName().replaceAll(':', '-').replaceAll(" ","_")}-${this.getMacAddress().replaceAll(':', '-')}`
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

    getState(){
        return this._state
    }

    isActive(){
        return this._state=="ACTIVE"
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
    _propertiesChanged(props){
        this._lastContact=Date.now()
            
        if (props.RSSI) {
            this.currentProperties.RSSI=this.valueIfVariant(props.RSSI)
            this.emit("RSSI", this.currentProperties.RSSI) //tell any RSSI listeners of the new value
        }
        if (props.ServiceData)
            this.currentProperties.ServiceData=this.valueIfVariant(props.ServiceData) 

        if (props.ManufacturerData)
            this.currentProperties.ManufacturerData=this.valueIfVariant(props.ManufacturerData)
        if (this.isActive())
            this.propertiesChanged(props)

    }
    propertiesChanged(props){
        //implemented by subclass
    }

   /**
   * 
   */

    emitGATT(){
        throw new Error("Subclass must implement ::emitGATT function")
    }

    emitData(tag, buffer, ...args){
        const md = this.getPath(tag)
        if (md && md.read)
            this.emit(tag, md.read(buffer, ...args))

        
    }

    emitValuesFrom(buffer){
        Object.keys(this.getPaths())
            .forEach(
                (tag)=>this.emitData(tag,buffer)
        )
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
            this._propertiesChanged(this.currentProperties)
        } catch(e){
            this.debug(e)
        }
        return this
    }

  /**
   *  Stop Listening to sensor.
   *  Implemented by subclass if additional behavior necessary (like disconnect() from device's GattServer etc.)
   * 
   *  Called automatically by Plugin::plugin.stop()
   */

    async stopListening(){
        this.removeAllListeners()
        this.device.helper.removeListeners()
        if (this.intervalID){
            clearInterval(this.intervalID)
        }
        this._state="ASLEEP"
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
		Object.keys(this.getPaths()).forEach((tag)=>{
            const pathMeta=this.getPath(tag)
            const path = config.paths[tag]
            if (!(path===undefined))
                this.app.handleMessage(id, 
                {
                updates: 
                    [{ meta: [{path: preparePath(this, path), value: { units: pathMeta?.unit }}]}]
                })
        })
	}

	 initPaths(deviceConfig, id){
		Object.keys(this.getPaths()).forEach((tag)=>{
            const pathMeta=this.getPath(tag)
			const path = deviceConfig.paths[tag];
			if (!(path === undefined)) {
                this.on(tag, (val)=>{
					if (pathMeta.notify){
						this.app.notify(tag, val, id )
					} else {
						this.updatePath(preparePath(this,path),val,id)
					}
                })
			}
		})
	}
	updatePath(path, val,id){
		this.app.handleMessage(id, {updates: [ { values: [ {path: path, value: val }] } ] })
  	}  
    elapsedTimeSinceLastContact(){
        return (Date.now()-this?._lastContact??Date.now())/1000
    }
}

module.exports = BTSensor   