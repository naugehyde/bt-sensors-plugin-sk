const fs = require('fs')
const util = require('util')
const path = require('path')
const {createBluetooth} = require('node-ble')
const {bluetooth, destroy} = createBluetooth()

const BTSensor = require('./BTSensor.js')

const Device = require('./node_modules/node-ble/src/Device.js')
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
	async function  instantiateSensor(device){
//		app.debug(`instantiating ${await device.getAddress()}`)
		try{
		for (var [clsName, cls] of classMap) {
			const c = await cls.identify(device)
			if (c)
				return new c(device)		
		}} catch(error){
			app.debug(`Unable to instantiate ${await device.getAddress()}: ${error.message} `)
		}
		return new (classMap.get('UNKNOWN'))(device)
	}

	function createPaths(peripheral_config){
		peripheral_config.sensor.getMetadata().forEach((metadatum, tag)=>{
			const path = peripheral_config[tag]
			if (!(path===undefined))
				app.handleMessage(plugin.id, 
				{
				updates: 
					[{ meta: [{path: path, value: { units: metadatum?.unit }}]}]
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
				oneOf.properties[tag]={type:'string', title: "Path for "+metadatum.description}
		})
		plugin.schema.properties.peripherals.items.dependencies.mac_address.oneOf.push(oneOf)

	}

	function updateAdapters(){
		bluetooth.adapters().then((adapters)=>
			{plugin.schema.properties.adapter.enum = adapters} 
		)
	}

	async function createSensor(adapter, mac, timeout=discoveryTimeout) {
		var s
		if (sensorMap.has(mac)) 
			return sensorMap.get(mac)
		try {
			const device = await adapter.waitDevice(mac,timeout*1000)
			s = await instantiateSensor(device) 
			sensorMap.set(mac,s)
			addSensorToList(s)
			return s
		}
		catch (e) {
			if (s)
				s.disconnect()		
				app.debug("Unable to connect to device " + mac +". Reason: "+ e.message )	
			return null							
		}
	}
	async function kickScanner(adapter){
		try { 
			try {await adapter.helper.callMethod('StopDiscovery')} catch(e) {}
			await adapter.helper.callMethod('SetDiscoveryFilter', {
					Transport: new Variant('s', 'le')
			})
			await adapter.helper.callMethod('StartDiscovery')
		}
		catch (error) {
			app.debug(`Error starting scanner: ${error.message}`)
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
						 await createSensor(adapter,mac)						
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
			await sleep(10000) //Make sure plugin.stop() completes first
			app.debug('Plugin restarted');
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
				createSensor(adapter, peripheral.mac_address, peripheral.discoveryTimeout).
				then((sensor)=>{
					if (sensor==null) {
						app.debug(`Unable to contact ${peripheral.mac_address}`)
					}
					else {
						app.debug(`Got info for ${peripheral.mac_address} `)
						peripheral.sensor=sensor
						if (peripheral.active) {
							createPaths(peripheral)
							peripheral.sensor.connect().then(async (sensor)=>{
							if (sensor){ 
								app.debug(`Connected to ${peripheral.mac_address}`);
								sensor.getMetadata().forEach((metadatum, tag)=>{
									const path = peripheral[tag];
									if (!(path === undefined))
										sensor.on(tag, (val)=>{
											updatePath(path,val)
									})
								})
								app.setPluginStatus(`Connected to ${++found} sensors.`);
							}
							})
						}
					}
				})
				.catch((error)=>
					{app.debug(`Unable to connect to ${peripheral.mac_address}. Reason: ${error.message}`)	})
			}
			peripherals=options.peripherals
		}
	} 
	plugin.stop =  async function () {
		app.debug("Stopping plugin")
		var adapter = await bluetooth.getAdapter(app.settings?.btAdapter??adapterID)
		if (await adapter.isDiscovering())
			try{
				await adapter.stopDiscovery()
				app.debug('Scan stopped')
			} catch (e){
				app.debug(`Error stopping scan: ${e.message}`)
			}
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

		app.debug('BT Sensors plugin stopped')

	}
	plugin.stopAsync =  function () {
		app.debug("Stopping plugin")
		const promises = []
		if ((peripherals)){
			for (var p of peripherals) {
				if (p.sensor !== undefined) {
					var promise = new Promise( async function (resolve, reject) {
						try{
							app.debug(`Disconnecting from ${p.mac_address}`)
							await p.sensor.disconnect()
							app.debug(`Disconnected from ${p.mac_address}`)
							resolve(p)
						
						}
						catch (e){
							app.debug(`Error disconnecting from ${p.mac_address}: ${e.message}`)
							resolve(p)
						}
					})
				}				
				promises.push(promise)
			}
		}
		promises.push(new Promise(async (resolve,reject)=>{
			var adapter = await bluetooth.getAdapter(app.settings?.btAdapter??adapterID)
			await adapter.stopDiscovery()
			app.debug('Scan stopped')
			resolve(adapter)
		}))

		Promise.allSettled(promises).then((resp)=>{
			app.debug('BT Sensors plugin stopped')
		})

	}
	return plugin;
}
