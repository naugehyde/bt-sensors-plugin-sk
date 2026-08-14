const packageInfo = require("./package.json")


let bluetooth, destroy, Variant, bleLoadError
try {
	//dbus-next first: node-ble depends on it, so a partial load can only
	//leave Variant set with bluetooth undefined -- never the reverse
	;({Variant} = require('@jellybrick/dbus-next'))
	const {createBluetooth} = require('@naugehyde/node-ble')
	;({bluetooth, destroy} = createBluetooth())
} catch (e) {
	//BlueZ/D-Bus unavailable -- the plugin can still run as a BLE API consumer
	bleLoadError = e?.message ?? String(e)
}

const BTSensor = require('./BTSensor.js')
const BLACKLISTED = require('./sensor_classes/BlackListedDevice.js')
const OutOfRangeDevice = require("./OutOfRangeDevice.js")
const MissingAdapter = require("./MissingAdapter.js")
const BLEApiDevice = require("./BLEApiDevice.js")
const { createChannel, createSession } = require("better-sse");
const { clearTimeout } = require('timers')
const loadClassMap = require('./classLoader.js')
class MissingSensor  {

	constructor(config){
		this.config=config
		this.addPath=BTSensor.prototype.addPath.bind(this)
		this.addParameter=BTSensor.prototype.addParameter.bind(this)
		this.addDefaultPath=BTSensor.prototype.addDefaultPath.bind(this)
		this.addDefaultParam=BTSensor.prototype.addDefaultParam.bind(this)
		this.getPath=BTSensor.prototype.getPath.bind(this)
		this.getImageSrc=BTSensor.prototype.getImageSrc.bind(this)

		this.getJSONSchema = BTSensor.prototype.getJSONSchema.bind(this)
		this.initSchema = BTSensor.prototype.initSchema.bind(this)


		this.initSchema()
		var keys = Object.keys(config?.paths??{})

		keys.forEach((key)=>{
			this.addPath(key, 
				{ type: config.paths[key]?.type??'string',  
				  title: config.paths[key].title} )
		} )
		keys = Object.keys(config?.params??{})
		keys.forEach((key)=>{
			this.addParameter(key, 
				{ type: config.params[key]?.type??'string',  
				  title: config.params[key].title 
				})
			this[key]=config.params[key]
		})
		this.mac_address = config.mac_address
		
	}
	hasGATT(){
		return this.config.gattParams
	}
	initGATTConnection(){
		
	}

	getGATTDescription(){
		return ""
	}
	getMetadata(){
		return this.metadata
	}
	getMacAddress(){
		return this.mac_address
	}
	getDomain(){
		return BTSensor.SensorDomains.unknown
	}
	getDescription(){
		return ""
	}
	getName(){
		return `${this?.name??"Unknown device"} (OUT OF RANGE)`
	}	
	getDisplayName(){
		return `(${this.getName()} ${this.getMacAddress()})`
	}
	getRSSI(){
		return NaN
	}
	getBatteryStrength(){
		return NaN
	}
	getState(){
		return "OUT_OF_RANGE"
	}
	stopListening(){}
	listen(){}
	isActive(){
		return false
	}
	isConnected(){return false}

	
	elapsedTimeSinceLastContact(){
		return NaN
	}
	getSignalStrength(){
		return NaN
	}
	prepareConfig(){
		
	}
	getErrorLog(){
		return []
	}
	getDebugLog(){
		return []
	}

	removeAllListeners(){

	}
	on(){

	}
	stopNotifications(){}
	isError(){
		return true
	}

}

const { resolveBleMode } = require('./bleMode.js')

module.exports =   function (app) {
	var deviceConfigs=[]
	var starts=0
	
	var plugin = {
		debug (message)  {
			app.debug(message)
			const logEntry = {
				timestamp: Date.now(), 
				message: message
			}
			this.log.push(logEntry)
			if (channel)
				channel.broadcast(logEntry,"pluginDebug")
		},
		setError( error ){
			app.setPluginError(error)
			app.debug(error)
			const logEntry = {
				timestamp: Date.now(), 
				message: error
			}
			this.errorLog.push(logEntry)
			if (channel)
				channel.broadcast( logEntry, "pluginError" )
		},
		setStatusText( status ){
			app.setPluginStatus(status)
			const logEntry = {timestamp: Date.now(), message: status}
			this.log.push(logEntry)
			if (channel)
				channel.broadcast( logEntry, "pluginStatusText" )
		},
		setFatalError( error ){
			this.setError(`FATAL ERROR: ${error}`)
			this.stop()

		}
	}
	plugin.id = 'bt-sensors-plugin-sk';
	plugin.name = 'BT Sensors plugin';
	plugin.description = 'Plugin to communicate with and update paths to BLE Sensors in Signalk';
	plugin.log = []
	plugin.errorLog = []
	
	plugin.schema = {			
		type: "object",
		htmlDescription: 
`<h2><a href="https://github.com/naugehyde/bt-sensors-plugin-sk/tree/1.2.0-beta#configuration" target="_blank">Plugin Documenation</a><p/><a href="https://github.com/naugehyde/bt-sensors-plugin-sk/issues/new/choose" target="_blank">Report an issue</a><p/><a href="https://discord.com/channels/1170433917761892493/1295425963466952725" target="_blank">Discord thread</a></h2>
 `,
		required:["adapter","discoveryTimeout", "discoveryInterval"],
		properties: {
			adapter: {title: "Bluetooth adapter",
				type: "string", default: "hci0"},
			transport: {title: "Transport ",
				type: "string", enum: ["auto","le","bredr"], default: "le", enumNames:["Auto", "LE-Bluetooth Low Energy", "BR/EDR Bluetooth basic rate/enhanced data rate"]},
			duplicateData: {title: "Set scanner to report duplicate data", type: "boolean", default: false, },
			discoveryTimeout: {title: "Default device discovery timeout (in seconds)", 
				type: "integer", default: 30,
				minimum: 10,
				maximum: 3600 
			},
			inactivityTimeout: {title: "Inactivity timeout in seconds -- set to 0 to disable. (If no contact with any sensors for this period, the plugin will attempt to power cycle the Bluetooth adapter.)", 
				type: "integer", default: 0,
				minimum: 0,
				maximum: 3600 
			},
			discoveryInterval: {title: "Scan for new devices interval (in seconds-- 0 for no new device scanning)", 
				type: "integer", 
				default: 10,
				minimum: 0
			 },
		}
	}

	
	plugin.started=false
	
	var discoveryIntervalID, progressID, progressTimeoutID, deviceHealthID, bleSettingsWatchID
	var adapter
	var useBleApi=false      //consume the server's BLE API advertisement stream
	var useLocalAdapter=true //run our own BlueZ scan on the local adapter
	var bleApiUnsubscribe=null
	const channel = createChannel()
	
	plugin.debug(`Loading plugin ${packageInfo.version}`)

	const sensorMap=new Map()

	plugin.start = async function (options, restartPlugin) {
	const classMap = loadClassMap(app)

		plugin.started=true
		var adapterID=options.adapter
		var foundConfiguredDevices=0

		if (Object.keys(options).length==0){ //empty config means initial startup. save defaults and enabled=true. 
			let json = {configuration:{adapter:"hci0", transport:"le", discoveryTimeout:30, discoveryInterval:10}, enabled:true, enableDebug:false}
			let appDataDirPath = app.getDataDirPath()
			let jsonFile = appDataDirPath+'.json'
			const fs = require("node:fs")
			try {
				fs.writeFileSync(jsonFile, JSON.stringify(json, null,2))
				options=json
			} catch(err){
				console.log(`Error writing initial config: ${err.message} `)
				console.log(err)
			}

		}

		//Mirror the server's Bluetooth settings (see resolveBleMode above)
		const bleMode = resolveBleMode(app)
		useBleApi = bleMode.useBleApi
		useLocalAdapter = bleMode.useLocalAdapter
		plugin.debug(`BLE source: ${bleMode.reason}`)

		//The Local Bluetooth Adapter toggle applies live on the server, so
		//watch it and restart into the matching mode when it changes.
		if (app.bleApi && !bleSettingsWatchID){
			const localManagedAtStart = app.bleApi.localBluetoothManaged
			bleSettingsWatchID = setInterval(()=>{
				if (app.bleApi.localBluetoothManaged != localManagedAtStart){
					plugin.debug("Server Bluetooth settings changed -- restarting plugin to apply the new BLE source")
					restartPlugin(options)
				}
			}, 30000)
		}

		plugin.registerWithRouter = function(router) {
			router.get('/getSensorInfo', async (req, res) => {
				const _sensor = sensorMap.get(normMac(req.query?.mac_address))
				const _class = classMap.get(req.query?.class)
				let _tempSensor = null
				if (_sensor &&_class && _sensor instanceof classMap.get("UNKNOWN")){
					try {

						_tempSensor = new _class ( _sensor.device )
						_tempSensor.currentProperties=_sensor.currentProperties
						_tempSensor._app = app
						_tempSensor._adapter=(_sensor.device instanceof BLEApiDevice)?null:adapter
						await _tempSensor.init()
						const _json = sensorToJSON(_tempSensor)
						res.status(200).json(_json)
					} catch (e){
						res.status(400).send(`Invalid request: ${e.message}`)
					}
					finally{
						if (_tempSensor)
							_tempSensor.stopListening()						
					}
				} else{
					res.status(404).json({message: `Invalid request`})
	
				}
			})

			router.post('/updateSensorData', async (req, res) => {
				const reqMac = normMac(req.body.mac_address)
				const sensor = sensorMap.get(reqMac)
				if (!sensor) {
					res.status(404).json({message: "Sensor not found"})
					return
				}
				sensor.prepareConfig(req.body)
				const i = deviceConfigs.findIndex((p)=>normMac(p.mac_address)==reqMac)
				if (i<0){
					if (!options.peripherals){
						if (!options.hasOwnProperty("peripherals"))
							options.peripherals=[]

						options.peripherals=[]
					}
					options.peripherals.push(req.body)
				} else {
					options.peripherals[i] = req.body
				}
				deviceConfigs=options.peripherals
				app.savePluginOptions(
					options, async () => {
						res.status(200).json({message: "Sensor updated"})
						if (sensor) {
							if (sensor.isActive()) {
								await sensor.stopListening()
								removeSensorFromList(sensor)
							}
						}
						if (sensor && sensor.device instanceof BLEApiDevice)
							//BLE-API-backed device: re-init from the existing
							//virtual device -- there is no adapter to scan
							initConfiguredDeviceWithDevice(sensor.device, req.body)
						else if (useLocalAdapter)
							initConfiguredDevice(req.body)
					}
				)

			});
			router.post('/removeSensorData', async (req, res) => {
				const sensor = sensorMap.get(normMac(req.body.mac_address))
				if (!sensor) {
					res.status(404).json({message: "Sensor not found"})
					return
				}
				const i = deviceConfigs.findIndex((p)=>normMac(p.mac_address)==normMac(req.body.mac_address))
				if (i>=0){
					deviceConfigs.splice(i,1)
				}

				if (sensor.isActive())
					await sensor.stopListening()

				if (sensorMap.has(normMac(req.body.mac_address)))
					sensorMap.delete(normMac(req.body.mac_address))
				app.savePluginOptions(
					options, () => {
						res.status(200).json({message: "Sensor updated"})
						channel.broadcast({},"resetSensors")
					}
				)
				
			});

			router.post('/updateBaseData', async (req, res) => {
				
				Object.assign(options,req.body)
				app.savePluginOptions(
					options, () => {
						res.status(200).json({message: "Plugin updated"})
						channel.broadcast({},"pluginRestarted")
						restartPlugin(options)
					}
				)
			});
		
			router.get('/getBaseData', (req, res) => {
				
				res.status(200).json(
					{
					schema: plugin.schema,
					data: {
						adapter: options.adapter,
						transport: options.transport,
						duplicateData: options.duplicateData,
						discoveryTimeout: options.discoveryTimeout,
						discoveryInterval: options.discoveryInterval,
						inactivityTimeout: options.inactivityTimeout
					}
					}
				);
			})


			router.get('/getSensors', (req, res) => {
				const t = sensorsToJSON()
				res.status(200).json(t)
			  });

			router.get('/getProgress', (req, res) => {
				let deviceCount = deviceConfigs.filter((dc)=>dc.active).length
				const json = {"progress":foundConfiguredDevices/deviceCount, "maxTimeout": 1, 
							  "deviceCount":foundConfiguredDevices, 
							  "totalDevices": deviceCount}
				res.status(200).json(json)
				
			  });
			
			router.get('/getPluginState', async (req, res) => {
				res.status(200).json({
					"connectionId": Date.now(),
					"state":(plugin.started?"started":"stopped")
				})
			});
			router.get("/sse", async (req, res) => {
				const session = await createSession(req,res)
				channel.register(session)
				req.on("close", ()=>{
					channel.deregister(session)	
				})
			});
		
		};

		function sensorsToJSON(){
			return Array.from(
				Array.from(sensorMap.values()).filter((s)=>!(s instanceof BLACKLISTED) ).map(
				sensorToJSON
			))
		}

		function getSensorInfo(sensor){
	
			const s = sensor.getState()
			return { mac: sensor.getMacAddress(),
				     name: sensor.getName(),
					 class: sensor.constructor.name,
					 domain: sensor.getDomain().name,
					 state: sensor.getState(),
					 error: sensor.isError(),
					 errorLog: sensor.getErrorLog(),
					 debugLog: sensor.getDebugLog(),
					 RSSI: sensor.getRSSI(),
					 signalStrength: sensor.getSignalStrength(),
					 batteryStrength: sensor.getBatteryStrength(),
            		 connected: sensor.isConnected(),
            		 lastContactDelta: sensor.elapsedTimeSinceLastContact()
			}
		}

		function sensorToJSON(sensor){
			const config = getDeviceConfig(sensor.getMacAddress())
			const schema = sensor.getJSONSchema()
			schema.htmlDescription = sensor.getDescription()
			
			return {
					info: getSensorInfo(sensor),
					schema: schema,
					config: config?config:{},
					configCopy: JSON.parse(JSON.stringify(config?config:{}))
				}
		}

		async function startScanner(options) {
		
			const transport = options?.transport??"le"
			const duplicateData = options?.duplicateData??false
			plugin.debug("Starting scan...");
			//Use adapter.helper directly to get around Adapter::startDiscovery()
			//filter options which can cause issues with Device::Connect() 
			//turning off Discovery
			//try {await adapter.startDiscovery()}
			try{ 
				if (transport) {
					plugin.debug(`Setting Bluetooth transport option to ${transport}. DuplicateData to ${duplicateData}`)
					await adapter.helper.callMethod('SetDiscoveryFilter', {
						Transport: new Variant('s', transport),
						DuplicateData: new Variant('b', duplicateData)
					  })
					}
				await adapter.helper.callMethod('StartDiscovery') 
			} 
			catch (error){	
				plugin.debug(error)
			}
			
		}		
		function updateSensor(sensor){
			channel.broadcast(getSensorInfo(sensor), "sensorchanged")
		}

		function normMac(mac){
			return (mac??"").toUpperCase()
		}

		//Precedence when the same MAC is reachable through several sources
		//(hybrid mode): a locally connected device beats a BLE-API-fed one,
		//and both beat the out-of-range/missing placeholders.
		function sensorRank(sensor){
			if (sensor instanceof MissingSensor) return 0
			if (sensor.device instanceof OutOfRangeDevice) return 0
			if (sensor.device instanceof BLEApiDevice) return 1
			return 2 //backed by a real local (node-ble) device
		}

		function removeSensorFromList(sensor){
			sensor.removeAllListeners("_state")
			sensor.removeAllListeners("connected")
			sensor.removeAllListeners("error")
			sensor.removeAllListeners("debug")
			sensor.removeAllListeners("RSSI")

			const mac = normMac(sensor.getMacAddress())
			//only drop the map entry if it is actually this sensor --
			//the entry may already belong to a replacement
			if (sensorMap.get(mac)===sensor){
				sensorMap.delete(mac)
				channel.broadcast({mac:sensor.getMacAddress()},"removesensor")
			}
		}

		function addSensorToList(sensor){
			const mac = normMac(sensor.getMacAddress())
			const existing = sensorMap.get(mac)
			if (existing && existing!==sensor){
				if (sensorRank(existing) > sensorRank(sensor)){
					//a better-sourced sensor already covers this MAC --
					//discard the newcomer
					plugin.debug(`Keeping existing sensor for ${mac}; discarding lower-priority duplicate`)
					Promise.resolve(sensor.stopListening()).catch(()=>{})
					return false
				}
				Promise.resolve(existing.stopListening()).catch(()=>{})
				removeSensorFromList(existing)
			}
			sensorMap.set(mac,sensor)
			if (sensor instanceof BLACKLISTED)
				//kept in the map as an identification cache, not shown in the UI
				return true
			sensor.on("_state", (state)=>{
				updateSensor(sensor)
			})
			sensor.on("connected", (state)=>{
				updateSensor(sensor)			
			})
			sensor.on("errorDetected",(error)=>{
				updateSensor(sensor)		
			})
			sensor.on("debug", ()=>{
				updateSensor(sensor)			
			})
			sensor.on(sensor.constructor.batteryStrengthTag,()=>{
					updateSensor(sensor) 
			})
			sensor._lastRSSI=-1*Infinity
			sensor.on("RSSI",(()=>{
				if (Date.now()-sensor._lastRSSI > 10000) { //only update RSSI on client every 10 seconds

					sensor._lastRSSI=Date.now()
		
					updateSensor(sensor)
				}	

			}))
			channel.broadcast(sensorToJSON(sensor),"newsensor");
			return true
		}
		function deviceNameAndAddress(config){
			return `${config?.name??""}${config.name?" at ":""}${config.mac_address}`
		}
		
		function createSensor(adapter, config) {
			return new Promise( ( resolve, reject )=>{
			var s
			const startNumber=starts
			adapter.waitDevice(config.mac_address,(config?.discoveryTimeout??30)*1000)
			.then(async (device)=> { 
				if (startNumber != starts ) {
					return
				}
				s = await instantiateSensor(device,config) 
				if (!s) 
					reject("Unable to create sensor")
				else
				if (s instanceof BLACKLISTED)
					reject ( `Device is blacklisted (${s.reasonForBlacklisting()}).`)
				else{
					addSensorToList(s)
					resolve(s)
				}
			})
			.catch(async (e)=>{
				if (s)
					s.stopListening()
				else{
					const device = new OutOfRangeDevice(adapter, config)
					s = await instantiateSensor(device,config)
					device.once("deviceFound",async (device)=>{
						s.device=device
						s.listen()
						removeSensorFromList(s)
						addSensorToList(s)
						if (config.active) {
							s.clearUnableToCommunicate()
							await s.activate(config, plugin)
						}
						else {
							s.unsetError()
							s.setState("DORMANT")
						}
					})
					addSensorToList(s)
					resolve(s)
				}
				if (startNumber == starts ) {
					const errorTxt = `Unable to communicate with device ${deviceNameAndAddress(config)} Reason: ${e?.message??e}`

					if (config.active) {
						if(s) {
							s.setError(errorTxt)
							s.notifyUnableToCommunicate()	
						}
						 else 
							plugin.setError(errorTxt)
					}
					plugin.debug(errorTxt)
					plugin.debug(e)
					
					reject( e?.message??e )
				}	
			})})
		}
		function getDeviceConfig(mac){
			const m = normMac(mac)
			return deviceConfigs.find((p)=>normMac(p.mac_address)==m)
		}
		async function getClassFor(device,config){
			
			if (config.params?.sensorClass){
				const c = classMap.get(config.params.sensorClass)
				if (c==null)
					throw new Error ("Cannot find class "+config.params.sensorClass)
				return c
			}			
			for (var [clsName, cls] of classMap) {
				if (clsName.startsWith("_")) continue
				const c = await cls.identify(device)
				if (c) {
					if (Object.hasOwn(config, "params")) {
						config.params.sensorClass=clsName
					}
					return c
				}
			}
			return classMap.get('UNKNOWN')
		}
				
		async function instantiateSensor(device,config){
			try{
				const c = await getClassFor(device,config)
				c.debug=app.debug
				
				const sensor = new c(device, config?.params, config?.gattParams)
				sensor._paths=config.paths //this might be a good candidate for refactoring
				sensor._app=app
				sensor._adapter=(device instanceof BLEApiDevice)?null:adapter //HACK!
				await sensor.init()				
				return sensor
			}
			catch(error){
				if (!config.unconfigured) {
					const msg = `Unable to instantiate ${await BTSensor.getDeviceProp(device,"Address")}: ${error.message} `
					plugin.debug(msg)
					plugin.debug(error)
					if (config.active) 
						plugin.setError(msg)
				}
				return null
			}

		}	
		function activeDevices(){
			return Array.from(sensorMap.values()).filter(s=>s.isActive()).length
		}
		//Initialize a sensor directly from a device object (BLE API mode --
		//there is no adapter to wait on, the advertisement IS the discovery)
		async function initConfiguredDeviceWithDevice(device, deviceConfig){
			const startNumber=starts
			if (!deviceConfig.discoveryTimeout)
				deviceConfig.discoveryTimeout = options?.discoveryTimeout??30
			try {
				const sensor = await instantiateSensor(device, deviceConfig)
				if (!sensor) return
				if (startNumber!==starts){
					//plugin restarted while we were instantiating
					Promise.resolve(sensor.stopListening()).catch(()=>{})
					return
				}
				//BLACKLISTED sensors go into the map too (hidden from the UI):
				//later advertisements then hit the update path instead of
				//re-identifying the device on every advertisement
				if (!addSensorToList(sensor)) return
				if (!deviceConfig.unconfigured)
					++foundConfiguredDevices
				//no sensor.listen() here: instantiateSensor -> init() ->
				//initListen() already attached the PropertiesChanged handler
				if (deviceConfig.active && !(sensor instanceof BLACKLISTED)){
					try {
						await sensor.activate(deviceConfig, plugin)
						plugin.setStatusText(`Listening to ${activeDevices()} sensors.`)
					} catch (e){
						sensor.setError(`Unable to activate sensor. Reason: ${e.message}`)
					}
				}
			} catch (e){
				plugin.debug(`BLE API device init error: ${e.message}`)
			}
		}
		function initConfiguredDevice(deviceConfig){
			const startNumber=starts
			plugin.setStatusText(`Initializing ${deviceNameAndAddress(deviceConfig)}`);
			if (!deviceConfig.discoveryTimeout)
				deviceConfig.discoveryTimeout = options.discoveryTimeout
			createSensor(adapter, deviceConfig).then(async (sensor)=>{
				if (startNumber != starts ) {
						return
				}	
				if (deviceConfig.active && !(sensor.device instanceof OutOfRangeDevice) ) {
					try {
						await sensor.activate(deviceConfig, plugin)
						plugin.setStatusText(`Listening to ${activeDevices()} sensors.`);

					} catch (e){
						sensor.setError(`Unable to activate sensor. Reason: ${e.message}`)
					}
				}
				
			})
			.catch((error)=>
				{
					if (deviceConfig?.unconfigured??false) return
					if (startNumber != starts ) {
						return
					}	
					const msg =`Sensor at ${deviceConfig.mac_address} unavailable. Reason: ${error}`
					plugin.debug(msg)

					if (deviceConfig.active) 
						plugin.setError(msg)
					const sensor=new MissingSensor(deviceConfig)
					++foundConfiguredDevices
					
					addSensorToList(sensor) //add sensor to list with known options
				
				})
		}
		function findDevices (discoveryTimeout) {
			const startNumber = starts
			plugin.setStatusText("Scanning for new Bluetooth devices...");

			adapter.devices().then( (macs)=>{
				if (startNumber != starts ) {
					return
				}
				for (const mac of macs) {
					var deviceConfig = getDeviceConfig(mac)
					const sensor = sensorMap.get(normMac(mac))

					if (sensor) {
						if (sensor instanceof MissingSensor){
							removeSensorFromList(sensor)
							initConfiguredDevice(deviceConfig)
						}
					} else {

						if (!deviceConfig) {
							deviceConfig = {mac_address: mac, 
											discoveryTimeout: discoveryTimeout, 
											active: false, unconfigured: true}
							initConfiguredDevice(deviceConfig) 
						} 
					}
				}
			})
		}

		function findDeviceLoop(discoveryTimeout, discoveryInterval, immediate=true ){
			if (immediate)
				findDevices(discoveryTimeout)
			discoveryIntervalID = 
				setInterval( findDevices, discoveryInterval*1000, discoveryTimeout)
		}

		channel.broadcast({state:"started"},"pluginstate")

		function installMissingAdapter(message){
			plugin.debug(message)
			plugin.setError(message)
			if (adapter)
				adapter.helper._propsProxy.removeAllListeners()
			adapter = new MissingAdapter(adapterID)
		}

		//Acquire and prepare the local Bluetooth adapter.
		//Returns "ready" when the adapter is usable, "abort" when start() must
		//end (legacy behavior: MissingAdapter placeholder installed or plugin
		//stopped), or "unavailable" when no local adapter could be acquired
		//and the caller may degrade to BLE-API-only operation.
		async function setupLocalAdapter(){

			if (!bluetooth){
				//node-ble/D-Bus could not even be loaded
				if (!useBleApi){
					installMissingAdapter(`Bluetooth stack (BlueZ/D-Bus) unavailable: ${bleLoadError}`)
					return "abort"
				}
				plugin.debug(`Bluetooth stack (BlueZ/D-Bus) unavailable: ${bleLoadError}`)
				return "unavailable"
			}

			if (!adapterID || adapterID=="")
				adapterID = "hci0"

			// Populate adapter dropdown first so the admin UI can show current hardware
			// even when the configured adapter can't be resolved (missing or unknown hci).
			try{
				const activeAdapters = await bluetooth.activeAdapters()
				if (activeAdapters.length==0){
					//in hybrid mode this is expected on boxes without local BT --
					//the plugin degrades to BLE-API-only, so no error banner
					if (useBleApi)
						plugin.debug("No active Bluetooth adapters found.")
					else
						plugin.setError("No active Bluetooth adapters found.")
				}
				const adapterInfo = await Promise.all(activeAdapters.map(async (a) => {
					const [addr, name] = await Promise.all([a.getAddress(), a.getName()])
					return { hci: a.adapter, addr, name }
				}))
				plugin.schema.properties.adapter.enum=[]
				plugin.schema.properties.adapter.enumNames=[]
				for (const { hci, addr, name } of adapterInfo) {
					plugin.schema.properties.adapter.enum.push(hci)
					plugin.schema.properties.adapter.enumNames.push(`${hci} @ ${addr} (${name})`)
					plugin.schema.properties.adapter.enum.push(addr)
					plugin.schema.properties.adapter.enumNames.push(`${hci} @ ${addr} (${name}) [by MAC]`)
				}
			}
			catch(e){
				if (useBleApi)
					plugin.debug(`Unable to get adapters: ${e.message}`)
				else
					plugin.setError(`Unable to get adapters: ${e.message}`)
			}

			// On Victron devices adapter names are not consistent.
			// If adapterID looks like a MAC address, resolve it to hciX name
			if (/^([0-9a-fA-F]{2}:){5}[0-9a-fA-F]{2}$/.test(adapterID)) {
				const wantMac = adapterID.toLowerCase()
				let resolved = null
				try {
					const adapterNames = await bluetooth.adapters()
					for (const name of adapterNames) {
						const a = await bluetooth.getAdapter(name)
						const mac = await a.getAddress()
						if (mac.toLowerCase() === wantMac) {
							resolved = name
							break
						}
					}
				} catch (e) {
					if (useBleApi){
						plugin.debug(`Unable to enumerate adapters while resolving MAC ${adapterID}: ${e.message}`)
						return "unavailable"
					}
					installMissingAdapter(`Unable to enumerate adapters while resolving MAC ${adapterID}: ${e.message}`)
					return "abort"
				}
				if (!resolved) {
					if (useBleApi){
						plugin.debug(`No adapter found with MAC address ${adapterID}.`)
						return "unavailable"
					}
					installMissingAdapter(`No adapter found with MAC address ${adapterID}.`)
					return "abort"
				}
				plugin.debug(`Resolved adapter MAC ${adapterID} to ${resolved}`)
				adapterID = resolved
			}

			//Check if Adapter has changed since last start(), or if the previous
			//start left a placeholder MissingAdapter that should be re-acquired.
			if (adapter) {
				if (adapter.adapter!=adapterID || adapter instanceof MissingAdapter) {
					adapter.helper._propsProxy.removeAllListeners()
					adapter=null
				}
			}
			//Connect to adapter

			if (!adapter){
				plugin.debug(`Connecting to bluetooth adapter ${adapterID}`);

				const maxAttempts = 5
				const retryDelay = 3000
				for (let attempt = 1; attempt <= maxAttempts; attempt++) {
					try {
						adapter = await bluetooth.getAdapter(adapterID)
						break
					} catch (e) {
						if (attempt < maxAttempts) {
							const msg = `Bluetooth adapter ${adapterID} not ready (attempt ${attempt}/${maxAttempts}), retrying in ${retryDelay/1000}s...`
							plugin.debug(msg)
							plugin.setStatusText(msg)
							await new Promise(resolve => setTimeout(resolve, retryDelay))
						} else {
							if (useBleApi){
								plugin.debug(`Bluetooth Adapter ${adapterID} not found: ${e.message}`)
								return "unavailable"
							}
							installMissingAdapter(`Bluetooth Adapter ${adapterID} not found: ${e.message}`)
							return "abort"
						}
					}
				}
			}

			//(Re-)register the DBUS listener that monitors the adapter's
			//Powered status -- plugin.stop() removes all listeners from the
			//props proxy, so a reused adapter needs it registered again.

			await adapter.helper._prepare()
			adapter.helper._propsProxy.removeAllListeners()
			adapter.helper._propsProxy.on('PropertiesChanged', async (iface,changedProps,invalidated) => {
				if (Object.hasOwn(changedProps,"Powered")){
					if (changedProps.Powered.value==false) {
						if (plugin.started){ //only call stop() if plugin is started
							plugin.setStatusText(`Bluetooth Adapter ${adapterID} turned off. Plugin disabled.`)
							await plugin.stop()
						}
					} else {
						await restartPlugin(options)
					}
				}
			})
			if (!await adapter.isPowered()) {
				plugin.debug(`Bluetooth Adapter ${adapterID} not powered on.`)
				if (useBleApi)
					//keep the adapter and its Powered listener: powering
					//the adapter back on restarts the plugin into hybrid
					return "poweredOff"
				plugin.setError(`Bluetooth Adapter ${adapterID} not powered on.`)
				await plugin.stop()
				return "abort"
			}
			return "ready"
		}

		if (useLocalAdapter){
			const adapterState = await setupLocalAdapter()
			if (adapterState=="abort")
				return
			if (adapterState!="ready"){
				plugin.debug("Local Bluetooth unavailable -- continuing with the server BLE API only")
				plugin.setStatusText("Local Bluetooth unavailable -- using server BLE API")
				useLocalAdapter=false
				if (adapterState!="poweredOff")
					adapter=null
			}
		} else {
			adapter=null
		}

		sensorMap.clear()
		if (channel){
			channel.broadcast({state:"started"},"pluginstate")
		}
		deviceConfigs=options?.peripherals??[]

		//Consume the server's BLE API advertisement stream: local-provider
		//advertisements when the server manages the adapter, remote-gateway
		//advertisements always.
		if (useBleApi){
			if (bleApiUnsubscribe)
				bleApiUnsubscribe()
			const pendingApiInit = new Set()
			bleApiUnsubscribe = app.bleApi.onAdvertisement(plugin.id, (adv)=>{
				const mac = normMac(adv.mac)
				const sensor = sensorMap.get(mac)
				//stubs (missing/out-of-range) get replaced by a live
				//BLE-API-backed sensor on their first advertisement
				const isStub = sensor && sensorRank(sensor)==0

				if (sensor && !isStub){
					//update existing sensor's device with new advertisement data.
					//Locally backed (node-ble) devices have no updateAdvertisement
					//and are deliberately left alone -- local data wins.
					if (sensor.device && typeof sensor.device.updateAdvertisement === 'function'){
						const mfrData = {}
						if (adv.manufacturerData){
							for (const [id, hex] of Object.entries(adv.manufacturerData)){
								mfrData[id] = Buffer.from(hex, 'hex')
							}
						}
						sensor.device.updateAdvertisement({
							rssi: adv.rssi,
							name: adv.name,
							manufacturer_data: mfrData
						})
					}
				} else if (!pendingApiInit.has(mac)){
					pendingApiInit.add(mac)
					const mfrData = {}
					if (adv.manufacturerData){
						for (const [id, hex] of Object.entries(adv.manufacturerData)){
							mfrData[id] = Buffer.from(hex, 'hex')
						}
					}
					const device = new BLEApiDevice(mac, adv.name, {
						rssi: adv.rssi,
						manufacturer_data: mfrData
					})
					const config = getDeviceConfig(mac) || {
						mac_address: mac,
						discoveryTimeout: options?.discoveryTimeout??30,
						active: false,
						unconfigured: true
					}
					initConfiguredDeviceWithDevice(device, config)
						.finally(()=>pendingApiInit.delete(mac))
				}
			})
		}

		if (plugin.stopped) {
			plugin.stopped=false
		}


		if (starts>0){
			plugin.debug(`Plugin ${packageInfo.version} restarting...`);
		} else {
			plugin.debug(`Plugin ${packageInfo.version} started` )

		}
		starts++
		if (useLocalAdapter && !await adapter.isDiscovering())
			try{
				await startScanner(options)
			} catch (e){
				plugin.setError(`Error starting scan: ${e.message}`)
		}
		if (!(deviceConfigs===undefined)){
			const maxTimeout=Math.max(...deviceConfigs.map((dc)=>dc?.discoveryTimeout??options.discoveryTimeout))
			const totalDevices = deviceConfigs.filter((dc)=>dc.active).length

			var progress = 0
			if (progressID==null)
			progressID  = setInterval(()=>{
				channel.broadcast({"progress":++progress, "maxTimeout": maxTimeout, "deviceCount":foundConfiguredDevices, "totalDevices": totalDevices},"progress")
				if ( foundConfiguredDevices==totalDevices){
					if (progressTimeoutID) clearTimeout(progressTimeoutID)
					progressTimeoutID = null
					clearInterval(progressID)
					progressID = null
				}
			},1000);
			if (progressTimeoutID==null)
			progressTimeoutID = setTimeout(()=> {
				if (progressID) {

					clearInterval(progressID);
					progressID=null
					channel.broadcast({"progress":maxTimeout, "maxTimeout": maxTimeout, "deviceCount":foundConfiguredDevices, "totalDevices": totalDevices},"progress")
				} 
			}, (maxTimeout+1)*1000);

			if (useLocalAdapter){
				for (const config of deviceConfigs) {
					initConfiguredDevice(config)
				}
			} else {
				//no local adapter: configured devices attach on their first
				//advertisement from the BLE API. Seed placeholders so the UI
				//shows them as unavailable until then -- the advertisement
				//handler upgrades a MissingSensor to a live sensor.
				for (const config of deviceConfigs) {
					addSensorToList(new MissingSensor(config))
				}
			}
		}
		const minTimeout=Math.min(...deviceConfigs.map((dc)=>dc?.discoveryTimeout??options.discoveryTimeout))
		const intervalTimeout = ((minTimeout==Infinity)?(options?.discoveryTimeout??plugin.schema.properties.discoveryTimeout.default):minTimeout)*1000

		deviceHealthID = setInterval( async ()=> {
			let lastContactDelta=Infinity
			sensorMap.forEach((sensor)=>{
				const config = getDeviceConfig(sensor.getMacAddress())
				const dt = config?.discoveryTimeout??options.discoveryTimeout
				const lc=sensor.elapsedTimeSinceLastContact()
				//min last contact delta over locally backed sensors only --
				//BLE-API traffic must not mask a dead local adapter
				if (sensorRank(sensor)==2 && lc<lastContactDelta)
					lastContactDelta=lc
				if (lc > dt) { 
					updateSensor(sensor)
				}
				if (sensor.noContactThreshold && Number.isFinite(lc)){
					if (lc > sensor.noContactThreshold){
						if (sensor.isActive())
							sensor.notifyNoContact()
					}
					else{
						if (sensor.isActive())
							sensor.clearNoContact()
					}
				}
			})
			if (useLocalAdapter && sensorMap.size && options.inactivityTimeout && Number.isFinite(lastContactDelta) && lastContactDelta > options.inactivityTimeout)
			{

				plugin.debug(`No contact with any sensors for ${lastContactDelta} seconds. Recycling Bluetooth adapter.`)
				await adapter.setPowered(false)
				await adapter.setPowered(true)
			}

		}, intervalTimeout)
		
		if (!options.hasOwnProperty("discoveryInterval" )) //no config -- first run
			options.discoveryInterval = plugin.schema.properties.discoveryInterval.default

		if (useLocalAdapter && options.discoveryInterval && !discoveryIntervalID)
			findDeviceLoop(options?.discoveryTimeout??plugin.schema.properties.discoveryTimeout.default,
						   options.discoveryInterval)
	}
	plugin.stop =  async function () {
		plugin.debug("Stopping plugin")
		plugin.stopped=true
		plugin.started=false
		if (bleApiUnsubscribe) {
			try { bleApiUnsubscribe() } catch (e) { /* server may already be tearing down */ }
			bleApiUnsubscribe=null
		}
		if (bleSettingsWatchID) {
			clearInterval(bleSettingsWatchID)
			bleSettingsWatchID=null
		}
		channel.broadcast({state:"stopped"},"pluginstate")
		if (discoveryIntervalID) {
			clearInterval(discoveryIntervalID)
			discoveryIntervalID=null
		}
		if (progressID) {
			clearInterval(progressID)
			progressID=null
		}
		if (progressTimeoutID) {
			clearTimeout(progressTimeoutID)
			progressTimeoutID=null
		}

		if (deviceHealthID) {
			clearInterval(deviceHealthID)
			deviceHealthID=null
		}

		if ((sensorMap)){
				for await (const sensorEntry of sensorMap.entries()) {
				try{
					await sensorEntry[1].stopListening()
					plugin.debug(`No longer listening to ${sensorEntry[0]}`)
				}
				catch (e){
					plugin.setError(`Error stopping listening to ${sensorEntry[0]}: ${e.message}`)
				}
			}
		}
		sensorMap.clear()

		if (adapter) {
			adapter.helper._propsProxy.removeAllListeners()
			try{
				if( await adapter.isDiscovering()){
					await adapter.stopDiscovery()
					plugin.debug('Scan stopped')
				}
			} catch (e){
				const msg = e?.message ?? String(e)
				if (/InProgress|No discovery started/i.test(msg))
					//benign: BlueZ discovery is owned by another client
					//(e.g. the server's BLE manager) or already stopped
					plugin.debug(`Scan already stopped: ${msg}`)
				else
					plugin.setError(`Error stopping scan: ${msg}`)
			}
		}
		plugin.debug('BT Sensors plugin stopped')

	}

	return plugin;
}