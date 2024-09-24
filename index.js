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

Device.prototype.getUUIDs=async function() {
	return this.helper.prop('UUIDs')
}

Device.prototype.getProp=async function(propName) {
	const props = await this.helper.props()
			if (props[propName])
				return props[propName]
			else
				return null
}

Device.prototype.getNameSafe=async function(propName) {
	return this.getProp('Name')
}

Device.prototype.getAliasSafe=async function(propName) {
	return this.getProp('Alias')
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

	try{
		utilities_sk = require('../utilities-sk/utilities.js')
	}
	catch (error){
		try {
			utilities_sk = require('utilities-sk/utilities.js')
		} catch(error){
			console.log(`${plugin.id} Plugin utilities-sk not found. Please install.`)
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
		}
	}
	function sleep(x) {
		return new Promise((resolve) => {
		  setTimeout(() => {
			resolve(x);
		  }, x);
		});
	  }
	async function  instantiateSensor(device,params){
//		app.debug(`instantiating ${await device.getAddress()}`)
		try{
		for (var [clsName, cls] of classMap) {
			const c = await cls.identify(device)
			if (c) {
				if (c.name.startsWith("_")) continue
				const d = new c(device,params)	
				await d.init()
				return d
			}
		}} catch(error){
			app.debug(`Unable to instantiate ${await device.getAddress()}: ${error.message} `)
		}
		return new (classMap.get('UNKNOWN'))(device)
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
		description: "",
		properties: {
			adapter: {title: "Bluetooth Adapter", type: "string", enum:[], default:'hci0' },
			discoveryTimeout: {title: "Initial scan timeout (in seconds)", type: "number",default: 45 },
			peripherals:
				{ type: "array", title: "Sensors", items:{
					title: "", type: "object", 
					properties:{
						active: {title: "Active", type: "boolean", default: true },
						mac_address: {title: "Bluetooth Device", enum: [], enumNames:[], type: "string" },
						discoveryTimeout: {title: "Discovery timeout (in seconds)", type: "number", default:30},
					}, dependencies:{mac_address:{oneOf:[]}}
					
				}
			}
		}
	}
	
	async function addSensorToList(sensor){
		const mac_address = await sensor.getMacAddress()
		const displayName = await sensor.getDisplayName()
		const mac_addresses_list = plugin.schema.properties.peripherals.items.properties.
		mac_address.enum
		const mac_addresses_names = plugin.schema.properties.peripherals.items.properties.
		mac_address.enumNames

		if (!mac_addresses_list.includes(mac_address)) {
			mac_addresses_list.push(mac_address)
			mac_addresses_names.push(displayName)
		}
		var oneOf = {properties:{mac_address:{enum:[mac_address]}}}
		sensor.getMetadata().forEach((metadatum,tag)=>{
				oneOf.properties[tag]={type:metadatum?.type??'string', title: metadatum.description}
		})
		plugin.schema.properties.peripherals.items.dependencies.mac_address.oneOf.push(oneOf)

	}

	function updateAdapters(){
		bluetooth.adapters().then((adapters)=>
			{plugin.schema.properties.adapter.enum = adapters} 
		)
	}

	async function createSensor(adapter, params) {
		var s
		if (sensorMap.has(params.mac_address)) 
			return sensorMap.get(params.mac_address)
		try {
			const device = await adapter.waitDevice(params.mac_address,params.discoveryTimeout*1000)
			s = await instantiateSensor(device,params) 
			sensorMap.set(params.mac_address,s)
			addSensorToList(s)
			return s
		}
		catch (e) {
			if (s)
				s.disconnect()		
			app.debug("Unable to communicate with device " + params.mac_address +". Reason: "+ e.message )	
			return null							
		}
	}
	
	async function startScanner(){

		bluetooth.getAdapter(app.settings?.btAdapter??adapterID).then(async (adapter) => {
			app.debug("Starting scan...");
			try{ await adapter.stopDiscovery() } catch(error){}
			try{ await adapter.startDiscovery() } catch(error){}
			if (!(await adapter.isDiscovering())) 
				throw new Error  ("Could not start scan: Aborting")
			plugin.schema.description='Scanning for Bluetooth devices...'	
			setTimeout( async () => {
				adapter.devices().then( async (macs)=>{
					app.debug(`Found: ${util.inspect(macs)}`)
					for (var mac of macs) {	
						await createSensor(adapter,
							 {mac_address:mac, discoveryTimeout: discoveryTimeout})						
					}
					plugin.schema.description=`Scan complete. Found ${macs.length} Bluetooth devices.`
				})
			}, app.settings?.btDiscoveryTimeout ?? discoveryTimeout * 1000)
		})
	}
	const sensorMap=new Map()
	loadClassMap()
	updateAdapters()
	startScanner()
	plugin.start = async function (options, restartPlugin) {

		if (starts>0){
			app.debug('Plugin stopping...');
			await sleep(10000) //Make sure plugin.stop() completes first
			app.debug('Plugin restarting...');
			plugin.schema.properties.peripherals.items.dependencies.mac_address.oneOf=[]
			sensorMap.clear()
			startScanner()
		} else {
			app.debug('Plugin started');
		}
		starts++
		var adapter= await bluetooth.getAdapter(options?.adapter??app.settings?.btAdapter??adapterID)
		adapter.helper.on("PropertiesChanged", ((prop)=>{
			app.debug(prop)
		})
		)
		if (!(options.peripherals===undefined)){
			var found = 0
			for (const peripheral of options.peripherals) {
				app.debug(`Waiting on ${peripheral.mac_address}`);	
				app.setPluginStatus(`Waiting on ${peripheral.mac_address}`);
				
				createSensor(adapter, peripheral).then((sensor)=>{
					if (sensor==null) {
						app.debug(`Unable to contact ${peripheral.mac_address}`)
						//put paths in oneof based on options (which should exist)
					}
					else {
						app.debug(`Got info for ${peripheral.mac_address} `)
						peripheral.sensor=sensor
						if (peripheral.active) {
							app.debug(`Connected to ${peripheral.mac_address}`);
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
							peripheral.sensor.connect().then(async (sensor)=>{
								app.setPluginStatus(`Connected to ${++found} sensors.`);
							})
						}
					}	
				})
				.catch((error)=>
					{app.debug(`Sensor at ${peripheral.mac_address} unavailable. Reason: ${error.message}`)	})
			}
			peripherals=options.peripherals
		}
	} 
	plugin.stop =  async function () {
		app.debug("Stopping plugin")
		var adapter = await bluetooth.getAdapter(app.settings?.btAdapter??adapterID)

		if ((peripherals)){
			for (var p of peripherals) {
				if (p.sensor !== undefined) {
					try{
						await p.sensor.disconnect()
						app.debug(`Disconnected from ${p.mac_address}`)
					}
					catch (e){
						app.debug(`Error disconnecting from ${p.mac_address}: ${e.message}`)
					}
				}				
			}
		}

		if (await adapter.isDiscovering())
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
