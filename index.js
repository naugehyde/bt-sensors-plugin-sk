const fs = require('fs')
const util = require('util')
const path = require('path')
const {createBluetooth} = require('node-ble')
const {bluetooth, destroy} = createBluetooth()

const BTSensor = require('./BTSensor.js')

class MissingSensor  {
	

	constructor(config){
		this.Metadatum = BTSensor.Metadatum
		this.addMetadatum=BTSensor.prototype.addMetadatum
		this.getPathMetadata = BTSensor.prototype.getPathMetadata
		this.getParamMetadata = BTSensor.prototype.getParamMetadata

		this.metadata= new Map()
		var keys = Object.keys(config.paths)
		this.addMetadatum.bind(this)
		keys.forEach((key)=>{
			this.addMetadatum(key, config.paths[key]?.type??'string',  config.paths[key].description )
		} )
		keys = Object.keys(config.params)
		keys.forEach((key)=>{
			this.addMetadatum(key, config.params[key]?.type??'string',  config.params[key].description ).isParam=true
			this[key]=config.params[key]
		})
		this.mac_address = config.mac_address
		
		
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
		return this?.name??"Unknown device"
	}	
	getDisplayName(){
		return `OUT OF RANGE DEVICE (${this.getName()} ${this.getMacAddress()})`
	}

}
module.exports =  function (app) {
	const adapterID = 'hci0'
	var peripherals
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
	async function instantiateSensor(device,config){
		try{
		for (var [clsName, cls] of classMap) {
			const c = await cls.identify(device)
			if (c) {
				
				if (c.name.startsWith("_")) continue
				c.debug=app.debug
				c.debug.bind(c)
				const sensor = new c(device,config.params)
				if (sensor == undefined)
					debugger
				sensor.debug=app.debug
				await sensor.init()
				return sensor
			}
		}} catch(error){
			app.debug(`Unable to instantiate ${await BTSensor.getDeviceProp(device,"Address")}: ${error.message} `)
		}
		//if we're here ain't got no class for the device
		const sensor = new (classMap.get('UNKNOWN'))(device)
		await sensor.init()
		return sensor
	}

	function createPaths(config){
		config.sensor.getMetadata().forEach((metadatum, tag)=>{
			if ((!(metadatum?.isParam)??false)){ //param metadata is passed to the sensor at 
												 //create time through the constructor, and isn't a
												 //a value you want to see in a path 
				
				const path = config.paths[tag]
				if (!(path===undefined))
					app.handleMessage(plugin.id, 
					{
					updates: 
						[{ meta: [{path: path, value: { units: metadatum?.unit }}]}]
					})
			}
			})
	}

	function initPaths(peripheral){
		peripheral.sensor.getMetadata().forEach((metadatum, tag)=>{
			const path = peripheral.paths[tag];
			if (!(path === undefined))
				peripheral.sensor.on(tag, (val)=>{
					if (metadatum.notify){
						app.notify(	tag, val, plugin.id )
					} else {
						updatePath(path,val)
					}
			})
		})
	}
	function updatePath(path, val){
		app.handleMessage(plugin.id, {updates: [ { values: [ {path: path, value: val }] } ] })
  	}  

	function loadClassMap() {
		classMap = utilities_sk.loadClasses(path.join(__dirname, 'sensor_classes'))
	}

	app.debug('Loading plugin')
	
	plugin.schema = {			
		type: "object",
		description: "NOTE: Plugin must be enabled to configure. You will have to wait until the scanner has found your device before configuring it. To refresh the list of available devices and their configurations, just open and close the config screen by clicking on the arrow symbol in the config's top bar.",
		required:["discoveryTimeout", "discoveryInterval"],
		properties: {
			discoveryTimeout: {title: "Default device discovery timeout (in seconds)", 
				type: "integer", default: 30,
				minimum: 10,
				maximum: 3600 
			},
			discoveryInterval: {title: "Scan for new devices interval (in seconds-- 0 for no new device scanning)", 
				type: "integer", 
				default: 60,
				minimum: 0,
				multipleOf: 10
			 },
			peripherals:
				{ type: "array", title: "Sensors", items:{
					title: "", type: "object",
					properties:{
						active: {title: "Active", type: "boolean", default: true },
						mac_address: {title: "Bluetooth Sensor",  type: "string" },
						discoveryTimeout: {title: "Device discovery timeout (in seconds)", 
							type: "integer", default:30,
							minimum: 10,
							maximum: 600 
						}
					}
					
				}
			}
		}
	}
	const UI_SCHEMA =  
	{ "peripherals": {
		'ui:disabled': !plugin.started
 	}
	}
	plugin.uiSchema=UI_SCHEMA
		
	function updateSensorDisplayName(sensor){
		const mac_address =  sensor.getMacAddress()
		const displayName =  sensor.getDisplayName()

		const mac_addresses_list = plugin.schema.properties.peripherals.items.properties.
		mac_address.enum
		const mac_addresses_names = plugin.schema.properties.peripherals.items.properties.
		mac_address.enumNames

		var index = mac_addresses_list.indexOf(mac_address)
		if (index!=-1)
			mac_addresses_names[index]= displayName
	}
	function addSensorToList(sensor){
		if (!plugin.schema.properties.peripherals.items.dependencies)
			plugin.schema.properties.peripherals.items.dependencies={mac_address:{oneOf:[]}}
		
		if(plugin.schema.properties.peripherals.items.properties.mac_address.enum==undefined) {
			plugin.schema.properties.peripherals.items.properties.mac_address.enum=[]
			plugin.schema.properties.peripherals.items.properties.mac_address.enumNames=[]
		}
		const mac_addresses_names = plugin.schema.properties.peripherals.items.properties.mac_address.enumNames
		const mac_addresses_list = plugin.schema.properties.peripherals.items.properties.mac_address.enum
		const mac_address =  sensor.getMacAddress()
		const displayName =  sensor.getDisplayName()

		var index = mac_addresses_list.indexOf(mac_address)
		if (index==-1)
			index = mac_addresses_list.push(mac_address)-1
		mac_addresses_names[index]= displayName
		var oneOf = {properties:{mac_address:{enum:[mac_address]}}}
		
		oneOf.properties.params={
			title:`${sensor.getName().toUpperCase()}`,
			description: sensor.getDescription(),
			type:"object",
			properties:{}
		}
		sensor.getParamMetadata().forEach((metadatum,tag)=>{
			oneOf.properties.params.properties[tag]=metadatum.asJSONSchema()
		})

		oneOf.properties.paths={
			title:"Signalk Paths",
			description: `Signalk paths to be updated when ${sensor.getName()}'s values change`,
			type:"object",
			properties:{}
		}
		sensor.getPathMetadata().forEach((metadatum,tag)=>{
				oneOf.properties.paths.properties[tag]=metadatum.asJSONSchema()
		})
		plugin.schema.properties.peripherals.items.dependencies.mac_address.oneOf.push(oneOf)
	}
	function peripheralNameAndAddress(config){
		return `${config?.name??""}${config.name?" at ":""}${config.mac_address}`
	}
	
	async function createSensor(adapter, config) {
		return new Promise( ( resolve, reject )=>{
		var s
		
		app.debug(`Waiting on ${peripheralNameAndAddress(config)}`)
		adapter.waitDevice(config.mac_address,config.discoveryTimeout*1000)
		.then(async (device)=> { 
			app.debug(`Found ${config.mac_address}`)
			s = await instantiateSensor(device,config) 
			sensorMap.set(config.mac_address,s)
			addSensorToList(s)
			s.on("RSSI",(()=>{
				updateSensorDisplayName(s)
			}))
			resolve(s)
		})
		.catch((e)=>{
			if (s)
				s.disconnect()		
			app.debug(`Unable to communicate with device ${peripheralNameAndAddress(config)} Reason: ${e?.message??e}`)
			reject( e?.message??e )	
		})})
	}
	
	async function startScanner() {
		
		app.debug("Starting scan...");
		try{ await adapter.stopDiscovery() } catch(error){}
		try{ await adapter.startDiscovery() } catch(error){}
	}

	const sensorMap=new Map()
	var adapter
	
	plugin.started=false

	loadClassMap()

	plugin.start = async function (options, restartPlugin) {

		var discoveryIntervalID

		function isConfiguredPeripheral(mac){
			return options.peripherals.find((p)=>{p.mac_address==mac})!=-1
		}

		function findDevices (discoveryTimeout) {
			app.debug("Scanning for new Bluetooth devices...")
			app.setPluginStatus("Scanning for new Bluetooth devices...");

			adapter.devices().then( (macs)=>{
				for (var mac of macs) {	
					if (!sensorMap.has(mac)) {
						if (isConfiguredPeripheral(mac)) continue; 
						createSensor(adapter,
							{mac_address:mac, discoveryTimeout: discoveryTimeout*1000})
						.then((s)=>
							app.setPluginStatus(`Found ${s.getDisplayName()}.`)
						)
						.catch((e)=>
							app.debug(`Device at ${mac} unavailable. Reason: ${e}`)	
						)
					}	
				}
			})
		}

		function findDeviceLoop(discoveryTimeout, discoveryInterval, immediate=true ){
			if (immediate)
				findDevices(discoveryTimeout)
			discoveryIntervalID = setInterval( findDevices, discoveryInterval*1000, discoveryTimeout)
		}
	
	
		plugin.started=true
		plugin.uiSchema.peripherals['ui:disabled']=false
		sensorMap.clear()
		if (plugin.stopped) {
			await sleep(5000) //Make sure plugin.stop() completes first			
						  //plugin.start is called asynchronously for some reason
						  //and does not wait for plugin.stop to complete
			plugin.stopped=false
		}
		adapter = await bluetooth.getAdapter(app.settings?.btAdapter??adapterID)
		await startScanner()
		if (starts>0){
			app.debug('Plugin restarting...');
			if (plugin.schema.properties.peripherals.items.dependencies)
				plugin.schema.properties.peripherals.items.dependencies.mac_address.oneOf=[]
		} else {
			app.debug('Plugin build 2024.10.08 started');
			
		}
		starts++
		if (!await adapter.isDiscovering())
			try{
				await adapter.startDiscovery()
			} catch (e){
				app.debug(`Error starting scan: ${e.message}`)
		}
		if (!(options.peripherals===undefined)){
			var found = 0
			for (const peripheral of options.peripherals) {
				app.setPluginStatus(`Initializing ${peripheralNameAndAddress(peripheral)}`);
				if (!peripheral.discoveryTimeout)
					peripheral.discoveryTimeout = options.discoveryTimeout
				createSensor(adapter, peripheral).then((sensor)=>{
					peripheral.sensor=sensor
					if (peripheral.active) {
						createPaths(peripheral)
						initPaths(peripheral)
						const result = Promise.resolve(peripheral.sensor.connect())
						result.then(() => {
							app.debug(`Connected to ${peripheral.sensor.getDisplayName()}`);
							app.setPluginStatus(`Initial scan complete. Connected to ${++found} sensors.`);
						})
					}

				})
				.catch((error)=>
					{
						app.debug(`Sensor at ${peripheral.mac_address} unavailable. Reason: ${error}`)	
						addSensorToList(new MissingSensor(peripheral)) //add sensor to list with known options
		
					})
			}
			
			peripherals=options.peripherals
		}
		if (options.discoveryInterval && !discoveryIntervalID) 
			findDeviceLoop(options.discoveryTimeout, options.discoveryInterval)
	} 
	plugin.stop =  async function () {
		app.debug("Stopping plugin")
		plugin.stopped=true
		plugin.uiSchema.peripherals['ui:disabled']=true
		if ((sensorMap)){
			sensorMap.forEach(async (sensor, mac)=> {
				try{
					await sensor.disconnect()
					app.debug(`Disconnected from ${mac}`)
				}
				catch (e){
					app.debug(`Error disconnecting from ${mac}: ${e.message}`)
				}
			})				
		}
		
		if (discoveryIntervalID) {
			clearInterval(discoveryIntervalID)
			discoveryIntervalID=null
		}

		if (adapter && await adapter.isDiscovering())
			try{
				await adapter.stopDiscovery()
				app.debug('Scan stopped')
			} catch (e){
				app.debug(`Error stopping scan: ${e.message}`)
			}
		app.debug('BT Sensors plugin stopped')

	}
	
	return plugin;
}
