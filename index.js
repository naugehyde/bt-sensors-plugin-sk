const fs = require('fs')
const util = require('util')
const path = require('path')
const {createBluetooth} = require('node-ble')
const {bluetooth, destroy} = createBluetooth()

const BTSensor = require('./BTSensor.js')

try {
	var Device = require('../node-ble/src/Device.js')
	if (Device == undefined) throw new Error('')
} catch (error) {
	Device = require('./node_modules/node-ble/src/Device.js')	
}
const { Variant } = require('dbus-next')


class MissingSensor  {
	

	constructor(config){
		this.Metadatum = BTSensor.Metadatum
		this.addMetadatum=BTSensor.prototype.addMetadatum

		this.metadata= new Map()
		const keys = Object.keys(config)
			.filter(e=>(!(e=='mac_address' || e=='discoveryTimeout' || e=='active')))

		this.addMetadatum.bind(this)
		keys.forEach((key)=>{
			this.addMetadatum(key, config[key]?.type??'string',  config[key].description )
		} )
		this.mac_address = config.mac_address
		
	}
	getMetadata(){
		return this.metadata
	}
	getMacAddress(){
		return this.mac_address
	}
	getDisplayName(){
		return this.mac_address + " (OUT OF RANGE)"
	}
}
module.exports =  function (app) {
	const discoveryTimeout = 30
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
	async function instantiateSensor(device,params){
		try{
		for (var [clsName, cls] of classMap) {
			const c = await cls.identify(device)
			if (c) {
				
				if (c.name.startsWith("_")) continue
				c.debug=app.debug
				c.debug.bind(c)
				const sensor = new c(device,params)
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

	function createPaths(peripheral_config){
		peripheral_config.sensor.getMetadata().forEach((metadatum, tag)=>{
			if ((!(metadatum?.isParam)??false)){ //param metadata is passed to the sensor at 
												 //create time through the constructor, and isn't a
												 //a value you want to see in a path 
				
				const path = peripheral_config[tag]
				if (!(path===undefined))
					app.handleMessage(plugin.id, 
					{
					updates: 
						[{ meta: [{path: path, value: { units: metadatum?.unit }}]}]
					})
			}
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
		properties: {
			discoveryTimeout: {title: "Initial scan timeout (in seconds)", type: "number",default: 45 },
			scanForNewDevices: {title: "Scan for new devices", type: "boolean", default: true },
			peripherals:
				{ type: "array", title: "Sensors", items:{
					title: "", type: "object", 
					properties:{
						mac_address: {title: "Bluetooth Device", enum: [], enumNames:[], type: "string" },
						active: {title: "Active", type: "boolean", default: true },
						discoveryTimeout: {title: "Discovery timeout (in seconds)", type: "number", default:30},
					}, dependencies:{mac_address:{oneOf:[]}}
					
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
		const mac_address =  sensor.getMacAddress()
		const displayName =  sensor.getDisplayName()
		const mac_addresses_list = plugin.schema.properties.peripherals.items.properties.
		mac_address.enum
		const mac_addresses_names = plugin.schema.properties.peripherals.items.properties.
		mac_address.enumNames
		var index = mac_addresses_list.indexOf(mac_address)
		if (index==-1)
			index = mac_addresses_list.push(mac_address)-1
		mac_addresses_names[index]= displayName
		var oneOf = {properties:{mac_address:{enum:[mac_address]}}}
		sensor.getMetadata().forEach((metadatum,tag)=>{
				oneOf.properties[tag]=metadatum.asJSONSchema()
		})
		plugin.schema.properties.peripherals.items.dependencies.mac_address.oneOf.push(oneOf)
	}

	async function createSensor(adapter, params) {
		return new Promise( ( resolve, reject )=>{
		var s
		
		app.debug(`Waiting on ${params.mac_address}`)
		adapter.waitDevice(params.mac_address,params.discoveryTimeout*1000)
		.then(async (device)=> { 
			app.debug(`Found ${params.mac_address}`)
			s = await instantiateSensor(device,params) 
			sensorMap.set(params.mac_address,s)
			addSensorToList(s)
			s.on("RSSI",(()=>{
				updateSensorDisplayName(s)
			}))
			resolve(s)
		})
		.catch((e)=>{
			if (s)
				s.disconnect()		
			app.debug("Unable to communicate with device " + params.mac_address +". Reason: "+ e.message )	
			reject( e.message )	
		})})
	}
	
	async function startScanner() {
		
		app.debug("Starting scan...");
		try{ await adapter.stopDiscovery() } catch(error){}
		try{ await adapter.startDiscovery() } catch(error){}
	}

	var discoveryInterval
	function findDeviceLoop(){

		plugin.schema.description='Scanning for new Bluetooth devices...'
		app.debug(plugin.schema.description)
		discoveryInterval = setInterval(  () => {
			adapter.devices().then( (macs)=>{
				for (var mac of macs) {	
					if (!sensorMap.has(mac)) {
						createSensor(adapter,
							{mac_address:mac, discoveryTimeout: discoveryTimeout*1000})
						.then((s)=>
							app.setPluginStatus(`Found ${s.getDisplayName()}.`)
						)
						.catch((e)=>
							app.debug(`Sensor at ${mac} unavailable. Reason: ${e}`)	
						)
					}	
				}
			})
		}, 30000)
	
	}

	const sensorMap=new Map()
	var adapter
	
	plugin.started=false

	loadClassMap()

	plugin.start = async function (options, restartPlugin) {
		plugin.started=true
		plugin.uiSchema.peripherals['ui:disabled']=false
		sensorMap.clear()
		if (plugin.stopped) {
			await sleep(5000) //Make sure plugin.stop() completes first			
						  //plugin.start is called asynchronously for some reason
						  //and does not wait for plugin.stop to complete
			plugin.stopped=false
		}
//		for (const peripheral of options.peripherals) 
//			addSensorToList(new MissingSensor(peripheral)) //add sensor to list with known options
		adapter = await bluetooth.getAdapter(app.settings?.btAdapter??adapterID)
		startScanner()
		if (starts>0){
			app.debug('Plugin restarting...');
			plugin.schema.properties.peripherals.items.dependencies.mac_address.oneOf=[]
		} else {
			app.debug('Plugin build 2024.10.04 started');
			
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
				app.setPluginStatus(`Setting up ${peripheral.mac_address}`);
				
				createSensor(adapter, peripheral)
				.then((sensor)=>{
					app.debug(`Got info for ${peripheral.mac_address} `)
					peripheral.sensor=sensor
					if (peripheral.active) {
						createPaths(peripheral)
						sensor.getMetadata().forEach((metadatum, tag)=>{
							const path = peripheral[tag];
							if (!(path === undefined))
								sensor.on(tag, (val)=>{
									if (metadatum.notify){
										app.notify(	tag, val, plugin.id )
									} else {
										updatePath(path,val)
									}
							})
						})
						const result = Promise.resolve(peripheral.sensor.connect())
						result.then(() => {
							app.debug(`Connected to ${peripheral.mac_address}`);
							app.setPluginStatus(`Connected to ${++found} sensors.`);
						})
					}

				})
				.catch((error)=>
					{
						app.debug(`Sensor at ${peripheral.mac_address} unavailable. Reason: ${error}`)	
						addSensorToList(new MissingSensor(peripheral)) //add sensor to list with known options
		
					})
			}
			if (options.scanForNewDevices && !discoveryInterval) 
				findDeviceLoop()
			peripherals=options.peripherals
		}
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
		
		if (discoveryInterval) {
			clearInterval(discoveryInterval)
			discoveryInterval=null
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
