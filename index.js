const fs = require('fs')
const util = require('util')
const path = require('path')
const semver = require('semver')
const packageInfo = require("./package.json")

const {createBluetooth} = require('node-ble')
const {Variant} = require('dbus-next')
const {bluetooth, destroy} = createBluetooth()

const BTSensor = require('./BTSensor.js')
const BLACKLISTED = require('./sensor_classes/BlackListedDevice.js')
const { createChannel, createSession } = require("better-sse");
const { clearTimeout } = require('timers')

class MissingSensor  {


	constructor(config){
		this.config=config
		this.addPath=BTSensor.prototype.addPath.bind(this)
		this.addParameter=BTSensor.prototype.addParameter.bind(this)

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
	getMetadata(){
		return this.metadata
	}
	getMacAddress(){
		return this.mac_address
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
	stopListening(){}
	listen(){}
	isActive(){
		return false
	}
	elapsedTimeSinceLastContact(){
		return NaN
	}
	getSignalStrength(){
		return NaN
	}

}
module.exports =   function (app) {
	var adapterID = 'hci0'
	

	var deviceConfigs
	var starts=0
	var classMap
	
	var utilities_sk
	
	var plugin = {};
	plugin.id = 'bt-sensors-plugin-sk';
	plugin.name = 'BT Sensors plugin';
	plugin.description = 'Plugin to communicate with and update paths to BLE Sensors in Signalk';
	
	//Try and load utilities-sk NOTE: should be installed from App Store-- 
	//But there's a fail safe because I'm a reasonable man.

	utilities_sk = {
		loadClasses: function(dir, ext='.js')
		{
			const classMap = new Map()
			const classFiles = fs.readdirSync(dir)
			.filter(file => file.endsWith(ext));
		
			classFiles.forEach(file => {
				const filePath = path.join(dir, file);
				const cls = require(filePath);
				classMap.set(cls.name, cls);
			})
			return classMap
		}
	}

	function sleep(x) {
		return new Promise((resolve) => {
		  setTimeout(() => {
			resolve(x);
		  }, x);
		});
	  }
	
	  function loadClassMap() {
		const _classMap = utilities_sk.loadClasses(path.join(__dirname, 'sensor_classes'))
		classMap = new Map([..._classMap].filter(([k, v]) => !k.startsWith("_") ))
		const libPath = app.config.appPath +(
			semver.gt(app.config.version,"2.13.5")?"dist":"lib"
		)
		import(libPath+"/modules.js").then( (modulesjs)=>{
		const { default:defaultExport} = modulesjs
			const modules = defaultExport.modulesWithKeyword(app.config, "signalk-bt-sensor-class")
			modules.forEach((module)=>{
				module.metadata.classFiles.forEach((classFile)=>{
					const cls = require(module.location+module.module+"/"+classFile);
					classMap.set(cls.name, cls);
				})
			})
			classMap.get('UNKNOWN').classMap=new Map([...classMap].sort().filter(([k, v]) => !v.isSystem )) // share the classMap with Unknown for configuration purposes
		})
	}

	app.debug(`Loading plugin ${packageInfo.version}`)
	
	plugin.schema = {			
		type: "object",
		required:["adapter","discoveryTimeout", "discoveryInterval"],
		properties: {
			adapter: {title: "Bluetooth adapter",
				type: "string", default: "hci0"},
			transport: {title: "Transport ",
				type: "string", enum: ["auto","le","bredr"], default: "le", enumNames:["Auto", "LE-Bluetooth Low Energy", "BR/EDR Bluetooth basic rate/enhanced data rate"]},
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

	const sensorMap=new Map()
	
	plugin.started=false

	loadClassMap()
	var discoveryIntervalID, progressID, progressTimeoutID, deviceHealthID
	var adapter 
	var adapterPower
	const channel = createChannel()

	plugin.registerWithRouter = function(router) {
		router.get('/sendPluginState', async (req, res) => {
		
			res.status(200).json({
				"state":(plugin.started?"started":"stopped")
			})
		});
		router.get("/sse", async (req, res) => {
			const session = await createSession(req, res);
			channel.register(session)
	   });
	
	}

	plugin.start = async function (options, restartPlugin) {
		plugin.started=true
		var adapterID=options.adapter
		var foundConfiguredDevices=0
		plugin.registerWithRouter = function(router) {

			router.post('/sendSensorData', async (req, res) => {
				app.debug(req.body)
				const i = deviceConfigs.findIndex((p)=>p.mac_address==req.body.mac_address) 
				if (i<0){
					options.peripherals.push(req.body)
				} else {
					options.peripherals[i] = req.body
				}
				app.savePluginOptions(
					options, async () => {
						app.debug('Plugin options saved')
						res.status(200).json({message: "Sensor updated"})
						const sensor = sensorMap.get(req.body.mac_address)
						if (sensor) {
							if (sensor.isActive()) {
								sensor.stopListening().then(()=> 
									initConfiguredDevice(req.body)
								)
							} else {
									initConfiguredDevice(req.body)
							}	
						} 
						
					}
				)
				
			});
			router.post('/removeSensorData', async (req, res) => {
				app.debug(req.body)
				const i = deviceConfigs.findIndex((p)=>p.mac_address==req.body.mac_address) 
				if (i>=0){
					deviceConfigs.splice(i,1)
				}
				if (sensorMap.has(req.body.mac_address))
					sensorMap.delete(req.body.mac_address)
				app.savePluginOptions(
					options, async () => {
						app.debug('Plugin options saved')
						res.status(200).json({message: "Sensor updated"})
						channel.broadcast({},"resetSensors")
					}
				)
				
			});

			router.post('/sendBaseData', async (req, res) => {
				
				app.debug(req.body)
				Object.assign(options,req.body)
				app.savePluginOptions(
					options, () => {
						app.debug('Plugin options saved')
						res.status(200).json({message: "Plugin updated"})
						sensorMap.clear()
						channel.broadcast({},"pluginRestarted")
						restartPlugin(options)
					}
				)
			});
		
		
			router.get('/base', (req, res) => {
				
				res.status(200).json(
					{
					schema: plugin.schema,
					data: {
						adapter: options.adapter,
						transport: options.transport,
						discoveryTimeout: options.discoveryTimeout,
						discoveryInterval: options.discoveryInterval
					}
					}
				);
			})
			router.get('/sensors', (req, res) => {
				app.debug("Sending sensors")
				const t = sensorsToJSON()
				res.status(200).json(t)
			  });

			router.get('/progress', (req, res) => {
				app.debug("Sending progress")
				const json = {"progress":foundConfiguredDevices/deviceConfigs.length, "maxTimeout": 1, 
							  "deviceCount":foundConfiguredDevices, 
							  "totalDevices": deviceConfigs.length}
				res.status(200).json(json)
				
			  });
			
			router.get('/sendPluginState', async (req, res) => {
		
				res.status(200).json({
					"state":(plugin.started?"started":"stopped")
				})
			});
			router.get("/sse", async (req, res) => {
				const session = await createSession(req, res);
				channel.register(session)
		   });
	

		};

		function sensorsToJSON(){
			return Array.from(
				Array.from(sensorMap.values()).filter((s)=>!(s instanceof BLACKLISTED) ).map(
				sensorToJSON
			))
		}

		function getSensorInfo(sensor){
			if (sensor.getName()=="vent") 
				debugger
			return { mac: sensor.getMacAddress(),
				     name: sensor.getName(),
					 RSSI: sensor.getRSSI(),
					 signalStrength: sensor.getSignalStrength(),
					 lastContactDelta: sensor. elapsedTimeSinceLastContact()
			}
		}

		function sensorToJSON(sensor){
			const config = getDeviceConfig(sensor.getMacAddress())
			return {
					info: getSensorInfo(sensor),
					schema: sensor.getJSONSchema(),
					config: config?config:{}
			
				}
		}
		async function startScanner(transport) {
		
			app.debug("Starting scan...");
			//Use adapter.helper directly to get around Adapter::startDiscovery()
			//filter options which can cause issues with Device::Connect() 
			//turning off Discovery
			//try {await adapter.startDiscovery()}
			try{ 
				if (transport) {
					app.debug(`Setting Bluetooth transport option to ${transport}`)
					await adapter.helper.callMethod('SetDiscoveryFilter', {
						Transport: new Variant('s', transport)
					  })
					}
				await adapter.helper.callMethod('StartDiscovery') 
			} 
			catch (error){	
				app.debug(error)
			}
			
		}
		
		function updateSensor(sensor){
			channel.broadcast(getSensorInfo(sensor), "sensorchanged")			
		}

		function removeSensorFromList(sensor){
			sensorMap.delete(config.mac_address)
			channel.broadcast({mac:sensor.getMacAddress()},"removesensor")
		}
		
		async function addSensorToList(sensor){
			sensorMap.set(await sensor.getMacAddress(),sensor)
			channel.broadcast(sensorToJSON(sensor),"newsensor");
		}
		function deviceNameAndAddress(config){
			return `${config?.name??""}${config.name?" at ":""}${config.mac_address}`
		}
		
		async function createSensor(adapter, config) {
			return new Promise( ( resolve, reject )=>{
			var s
			
			app.debug(`Waiting on ${deviceNameAndAddress(config)}`)
			adapter.waitDevice(config.mac_address,config.discoveryTimeout*1000)
			.then(async (device)=> { 
				app.debug(`Found ${config.mac_address}`)
				s = await instantiateSensor(device,config) 
	
				if (s instanceof BLACKLISTED)
					reject ( `Device is blacklisted (${s.reasonForBlacklisting()}).`)
				else{
				
					addSensorToList(s)
					s.on("RSSI",(()=>{
						updateSensor(s)
					}))
					resolve(s)
				}
			})
			.catch((e)=>{
				if (s)
					s.stopListening()
	
				app.debug(`Unable to communicate with device ${deviceNameAndAddress(config)} Reason: ${e?.message??e}`)
				app.debug(e)
				reject( e?.message??e )	
			})})
		}
		function getDeviceConfig(mac){
			return deviceConfigs.find((p)=>p.mac_address==mac) 
		}	
		async function instantiateSensor(device,config){
			try{
			for (var [clsName, cls] of classMap) {
				if (clsName.startsWith("_")) continue
				const c = await cls.identify(device)
				if (c) {
					c.debug=app.debug
					const sensor = new c(device,config?.params, config?.gattParams)
					sensor.debug=app.debug
					sensor.app=app
					await sensor.init()
					app.debug(`instantiated ${await BTSensor.getDeviceProp(device,"Address")}`)
					
					return sensor
				}
			}} catch(error){
				const msg = `Unable to instantiate ${await BTSensor.getDeviceProp(device,"Address")}: ${error.message} `
				app.debug(msg)
				app.debug(error)
				app.setPluginError(msg)
			}
			//if we're here ain't got no class for the device
			var sensor
			if (config.params?.sensorClass){
				const c = classMap.get(config.params.sensorClass)
				c.debug=app.debug
				sensor = new c(device,config?.params, config?.gattParams)
				sensor.debug=app.debug
				sensor.app=app
			} else{
				sensor = new (classMap.get('UNKNOWN'))(device)
				sensor.app=app
			}
			await sensor.init()
			return sensor
		}	
		
		function initConfiguredDevice(deviceConfig){
			app.setPluginStatus(`Initializing ${deviceNameAndAddress(deviceConfig)}`);
			if (!deviceConfig.discoveryTimeout)
				deviceConfig.discoveryTimeout = options.discoveryTimeout
			createSensor(adapter, deviceConfig).then((sensor)=>{

				if (deviceConfig.active) {
					sensor.activate(deviceConfig, plugin)
					app.setPluginStatus(`Listening to ${++foundConfiguredDevices} sensors.`);
				}
			})
			.catch((error)=>
				{
					if (deviceConfig.unconfigured) return

					const msg =`Sensor at ${deviceConfig.mac_address} unavailable. Reason: ${error}`
					app.debug(msg)
					app.debug(error)
					if (deviceConfig.active) 
						app.setPluginError(msg)
					const sensor=new MissingSensor(deviceConfig)
					addSensorToList(sensor) //add sensor to list with known options
					++foundConfiguredDevices
				
				})
		}
		function findDevices (discoveryTimeout) {
			app.setPluginStatus("Scanning for new Bluetooth devices...");


			adapter.devices().then( (macs)=>{
				for (var mac of macs) {	
					var deviceConfig = getDeviceConfig(mac)
					const sensor = sensorMap.get(mac)

					if (sensor && deviceConfig) {
						if (sensor instanceof MissingSensor)	
							removeSensorFromList(sensor)
						else 				
							return
					}
					if (!sensor) {
						if (!deviceConfig) {
							deviceConfig = {mac_address: mac, 
											discoveryTimeout: discoveryTimeout*1000, 
											active: false, unconfigured: true}
						} 
						initConfiguredDevice(deviceConfig) 
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

	
		if (!adapterID || adapterID=="")
			adapterID = "hci0"
		//Check if Adapter has changed since last start()
		if (adapter) {
			const n = await adapter.getName()
			if (n!=adapterID) {
				adapter.helper.removeAllListeners()
				adapter=null
			}
		}
		//Connect to adapter

		if (!adapter){
			app.debug(`Connecting to bluetooth adapter ${adapterID}`);

			adapter = await bluetooth.getAdapter(adapterID)

			//Set up DBUS listener to monitor Powered status of current adapter

			await adapter.helper._prepare()
			adapter.helper._propsProxy.on('PropertiesChanged', async (iface,changedProps,invalidated) => {
				app.debug(changedProps)
				if (Object.hasOwn(changedProps,"Powered")){
					if (changedProps.Powered.value==false) {
						if (plugin.started){ //only call stop() if plugin is started
							app.setPluginStatus(`Bluetooth Adapter ${adapterID} turned off. Plugin disabled.`)
							await plugin.stop()
						}
					} else { 				
						await restartPlugin(options)
					}
				}
			})
			if (!await adapter.isPowered()) {
				app.debug(`Bluetooth Adapter ${adapterID} not powered on.`)
				app.setPluginError(`Bluetooth Adapter ${adapterID} not powered on.`)
				adapterPower=false
				await plugin.stop()
				return
			}
		}
		adapterPower=true
	
		sensorMap.clear()
		if (channel)
			channel.broadcast({state:"started"},"pluginstate")
		deviceConfigs=options?.peripherals??[]

		if (plugin.stopped) {
			//await sleep(5000) //Make sure plugin.stop() completes first			
						  //plugin.start is called asynchronously for some reason
						  //and does not wait for plugin.stop to complete
			plugin.stopped=false
		}

		const activeAdapters = await bluetooth.activeAdapters()
		plugin.schema.properties.adapter.enum=[]
		plugin.schema.properties.adapter.enumNames=[]
		for (a of activeAdapters){
			plugin.schema.properties.adapter.enum.push(a.adapter)
			plugin.schema.properties.adapter.enumNames.push(`${a.adapter} @ ${ await a.getAddress()} (${await a.getName()})`)
		}
		
		await startScanner(options.transport)
		if (starts>0){
			app.debug(`Plugin ${packageInfo.version} restarting...`);
		} else {
			app.debug(`Plugin ${packageInfo.version} started` )
			
		}
		starts++
		if (!await adapter.isDiscovering())
			try{
				await startScanner()
			} catch (e){
				app.debug(`Error starting scan: ${e.message}`)
		}
		if (!(deviceConfigs===undefined)){
			const maxTimeout=Math.max(...deviceConfigs.map((dc)=>dc?.discoveryTimeout??options.discoveryTimeout))
			var progress = 0
			if (progressID==null) 
			progressID  = setInterval(()=>{
				app.debug("sending progress")
				channel.broadcast({"progress":++progress, "maxTimeout": maxTimeout, "deviceCount":foundConfiguredDevices, "totalDevices": deviceConfigs.length},"progress")
				if (foundConfiguredDevices==deviceConfigs.length){
					app.debug("sending progress complete") 
					channel.broadcast({"progress":maxTimeout, "maxTimeout": maxTimeout, "deviceCount":foundConfiguredDevices, "totalDevices": deviceConfigs.length},"progress")
					progressID,progressTimeoutID = null
					clearTimeout(progressTimeoutID)
					clearInterval(progressID)
					progressID = null
				}
			},1000); 
			if (progressTimeoutID==null)
			progressTimeoutID = setTimeout(()=> {
				app.debug("progress timed out ")
				if (progressID) {

					clearInterval(progressID);
					progressID=null
					channel.broadcast({"progress":maxTimeout, "maxTimeout": maxTimeout, "deviceCount":foundConfiguredDevices, "totalDevices": deviceConfigs.length},"progress")
				} 
			}, maxTimeout*1000);

			for (const deviceConfig of deviceConfigs) {
				initConfiguredDevice(deviceConfig)
			}
		}
		const minTimeout=Math.min(...deviceConfigs.map((dc)=>dc?.discoveryTimeout??options.discoveryTimeout))

		deviceHealthID = setInterval( ()=> {
			sensorMap.forEach((sensor)=>{
				const config = getDeviceConfig(sensor.getMacAddress())
				const dt = config?.discoveryTimeout??options.discoveryTimeout
				if (sensor.elapsedTimeSinceLastContact()> dt)
					channel.broadcast(getSensorInfo(sensor), "sensorchanged")
			})
		}, minTimeout*1000)
		
		if (options.discoveryInterval && !discoveryIntervalID) 
			findDeviceLoop(options.discoveryTimeout, options.discoveryInterval)
	} 
	plugin.stop =  async function () {
		app.debug("Stopping plugin")
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
		if (adapter && await adapter.isDiscovering())
			try{
				await adapter.stopDiscovery()
				app.debug('Scan stopped')
			} catch (e){
				app.debug(`Error stopping scan: ${e.message}`)
			}

		if ((sensorMap)){
			sensorMap.forEach(async (sensor, mac)=> {
				try{
					await sensor.stopListening()
					app.debug(`No longer listening to ${mac}`)
				}
				catch (e){
					app.debug(`Error stopping listening to ${mac}: ${e.message}`)
				}
			})				
		}
		
		app.debug('BT Sensors plugin stopped')

	}

	return plugin;
}
