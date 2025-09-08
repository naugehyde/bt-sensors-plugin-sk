const packageInfo = require("./package.json")


const {createBluetooth} = require('node-ble')
const {Variant} = require('dbus-next')
const {bluetooth, destroy} = createBluetooth()

const BTSensor = require('./BTSensor.js')
const BLACKLISTED = require('./sensor_classes/BlackListedDevice.js')
const OutOfRangeDevice = require("./OutOfRangeDevice.js")
const { createChannel, createSession } = require("better-sse");
const { clearTimeout } = require('timers')
const loadClassMap = require('./classLoader.js')
const { debug } = require("node:console")
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
	getState(){
		return "ERROR"
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

}
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
			discoveryInterval: {title: "Scan for new devices interval (in seconds-- 0 for no new device scanning)", 
				type: "integer", 
				default: 10,
				minimum: 0
			 },
		}
	}

	
	plugin.started=false
	
	var discoveryIntervalID, progressID, progressTimeoutID, deviceHealthID
	var adapter 
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

		plugin.registerWithRouter = function(router) {
			router.get('/getSensorInfo', async (req, res) => {
				const _sensor = sensorMap.get(req.query?.mac_address)
				const _class = classMap.get(req.query?.class)
				let _tempSensor = null
				if (_sensor &&_class && _sensor instanceof classMap.get("UNKNOWN")){
					try {

						_tempSensor = new _class ( _sensor.device )
						_tempSensor.currentProperties=_sensor.currentProperties
						_tempSensor._app = app
						_tempSensor._adapter=adapter
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
				const sensor = sensorMap.get(req.body.mac_address)
				sensor.prepareConfig(req.body)
				const i = deviceConfigs.findIndex((p)=>p.mac_address==req.body.mac_address) 
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
							if (sensor.isActive()) 
								await sensor.stopListening()
								removeSensorFromList(sensor)
						} 
						initConfiguredDevice(req.body)
					}
				)
				
			});
			router.post('/removeSensorData', async (req, res) => {
				const sensor = sensorMap.get(req.body.mac_address)
				if (!sensor) {
					res.status(404).json({message: "Sensor not found"})
					return
				}
				const i = deviceConfigs.findIndex((p)=>p.mac_address==req.body.mac_address) 
				if (i>=0){
					deviceConfigs.splice(i,1)
				}

				if (sensor.isActive()) 
					await sensor.stopListening()
				
				if (sensorMap.has(req.body.mac_address))
					sensorMap.delete(req.body.mac_address)
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
						discoveryInterval: options.discoveryInterval
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

		function removeSensorFromList(sensor){
			sensor.removeAllListeners("state")
			sensor.removeAllListeners("connected")
			sensor.removeAllListeners("error")
			sensor.removeAllListeners("debug")

			sensorMap.delete(sensor.getMacAddress())
			channel.broadcast({mac:sensor.getMacAddress()},"removesensor")
		}
		
		function addSensorToList(sensor){
			sensorMap.set(sensor.getMacAddress(),sensor)
			sensor.on("state", (state)=>{
				updateSensor(sensor)
			})
			sensor.on("connected", (state)=>{
				updateSensor(sensor)			
			})
			sensor.on("error",(error)=>{
				updateSensor(sensor)		
			})
			sensor.on("debug", ()=>{
				updateSensor(sensor)			
			})
			channel.broadcast(sensorToJSON(sensor),"newsensor");
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
					s._lastRSSI=-1*Infinity
					s.on("RSSI",(()=>{
						if (Date.now()-s._lastRSSI > 30000) { //only update RSSI on client every 30 seconds

							s._lastRSSI=Date.now()
				
							updateSensor(s)
						}	

					}))
					resolve(s)
				}
			})
			.catch(async (e)=>{
				if (s)
					s.stopListening()
				else{
					const device = new OutOfRangeDevice(adapter, config)
					const c = await getClassFor(device,config)
					if (c.domain==BTSensor.SensorDomains.beacons || c.IsRoaming){
						s = await instantiateSensor(device,config)
						device.once("deviceFound",async (device)=>{
								s.device=device
								s.listen()
								await s.activate(config, plugin)
								removeSensorFromList(s)
								addSensorToList(s)
						})
						addSensorToList(s)
						resolve(s)
					}
				}
				if (startNumber == starts ) {
					const errorTxt = `Unable to communicate with device ${deviceNameAndAddress(config)} Reason: ${e?.message??e}`
					if(s)
					{
						s.setError(errorTxt)
					} else {
						plugin.setError(errorTxt)
					}
					plugin.debug(e)

					reject( e?.message??e )
				}	
			})})
		}
		function getDeviceConfig(mac){
			return deviceConfigs.find((p)=>p.mac_address==mac) 
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
				sensor._adapter=adapter //HACK!
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
					plugin.setStatusText(`Listening to ${++foundConfiguredDevices} sensors.`);
					try {
						await sensor.activate(deviceConfig, plugin)
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
					const sensor = sensorMap.get(mac)

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


		if (!adapterID || adapterID=="")
			adapterID = "hci0"
		//Check if Adapter has changed since last start()
		if (adapter) {
			if (adapter.adapter!=adapterID) {
				adapter.helper._propsProxy.removeAllListeners()
				adapter=null
			}
		}
		//Connect to adapter

		if (!adapter){
			plugin.debug(`Connecting to bluetooth adapter ${adapterID}`);

			adapter = await bluetooth.getAdapter(adapterID)

			//Set up DBUS listener to monitor Powered status of current adapter

			await adapter.helper._prepare()
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
				plugin.setError(`Bluetooth Adapter ${adapterID} not powered on.`)
				await plugin.stop()
				return
			}
		}
	
		sensorMap.clear()
		if (channel){
			channel.broadcast({state:"started"},"pluginstate")
		}
		deviceConfigs=options?.peripherals??[]

		if (plugin.stopped) {
			plugin.stopped=false
		}

		try{
			const activeAdapters = await bluetooth.activeAdapters()
			if (activeAdapters.length==0){
				plugin.setError("No active Bluetooth adapters found.")
			}
			plugin.schema.properties.adapter.enum=[]
			plugin.schema.properties.adapter.enumNames=[]
			for (a of activeAdapters){
				plugin.schema.properties.adapter.enum.push(a.adapter)
				plugin.schema.properties.adapter.enumNames.push(`${a.adapter} @ ${ await a.getAddress()} (${await a.getName()})`)
			}}
		catch(e){
			plugin.setError(`Unable to get adapters: ${e.message}`)
		}
		
		await startScanner(options)
		if (starts>0){
			plugin.debug(`Plugin ${packageInfo.version} restarting...`);
		} else {
			plugin.debug(`Plugin ${packageInfo.version} started` )
			
		}
		starts++
		if (!await adapter.isDiscovering())
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
					progressID,progressTimeoutID = null
					clearTimeout(progressTimeoutID)
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

			for (const config of deviceConfigs) {
				initConfiguredDevice(config)
			}
		}
		const minTimeout=Math.min(...deviceConfigs.map((dc)=>dc?.discoveryTimeout??options.discoveryTimeout))
		const intervalTimeout = ((minTimeout==Infinity)?(options?.discoveryTimeout??plugin.schema.properties.discoveryTimeout.default):minTimeout)*1000
		deviceHealthID = setInterval( ()=> {
			sensorMap.forEach((sensor)=>{
				const config = getDeviceConfig(sensor.getMacAddress())
				const dt = config?.discoveryTimeout??options.discoveryTimeout
				const lc=sensor.elapsedTimeSinceLastContact()
				if (lc > dt) { 
					channel.broadcast(getSensorInfo(sensor), "sensorchanged")
				}
			})
		}, intervalTimeout)
		
		if (!options.hasOwnProperty("discoveryInterval" )) //no config -- first run
			options.discoveryInterval = plugin.schema.properties.discoveryInterval.default

		if (options.discoveryInterval && !discoveryIntervalID) 
			findDeviceLoop(options?.discoveryTimeout??plugin.schema.properties.discoveryTimeout.default, 
						   options.discoveryInterval)
	} 
	plugin.stop =  async function () {
		plugin.debug("Stopping plugin")
		plugin.stopped=true
		plugin.started=false
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
			if( await adapter.isDiscovering())
			try{
				await adapter.stopDiscovery()
				plugin.debug('Scan stopped')
			} catch (e){
				plugin.setError(`Error stopping scan: ${e.message}`)
			}
		}
		plugin.debug('BT Sensors plugin stopped')

	}

	return plugin;
}