const fs = require('fs')
const util = require('util')
const path = require('path')
const {createBluetooth} = require('node-ble')
const {bluetooth, destroy} = createBluetooth()

const BTSensor = require('./BTSensor.js')

const Device = require('./node_modules/node-ble/src/Device.js')

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
	
	var peripherals=[]
	var starts=0
	var classMap
	var sensorMap=new Map()
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

	async function  instantiateSensor(device){
		for (var [clsName, cls] of classMap) {
			const c = await cls.identify(device)
			if (c)
				return new c(device)		
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
	
	plugin.uiSchema = {
		peripherals: {
		 	  'ui:disabled': true
		}
	}
	
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
	
	function setDeviceNameInList(device,name){
		const deviceNamesList = plugin.schema.properties.peripherals.items.properties.
		mac_address.enumNames
		const deviceList = plugin.schema.properties.peripherals.items.properties.
		mac_address.enum

		deviceNamesList[deviceList.indexOf(device)]=`${name} (${device})` 
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
	}

	function addDeviceToList( mac_address, name ){
		const mac_addresses = plugin.schema.properties.peripherals.items.properties.
		mac_address.enum

		if (!mac_addresses.includes(mac_address)) {
			mac_addresses.push(mac_address)
			if (!(name===undefined))
				setDeviceNameInList(mac_address,name)
		}
	}
	async function getDeviceName(device){
		var dn = "UNKNOWN"
		try{
			dn =device.getNameSafe()
		}
		catch (error) {}
		return dn
	}

	function updateAdapters(){
		bluetooth.adapters().then((adapters)=>
			{plugin.schema.properties.adapter.enum = adapters} 
		)
	}
	async function updateSensorsProperties(){
		plugin.schema.properties.peripherals.items.dependencies.mac_address.oneOf=[]

		sensorMap.forEach((sensor,mac_address)=>{
			var oneOf = {properties:{mac_address:{enum:[mac_address]}}}
			sensor.getMetadata().forEach((metadatum,tag)=>{
					oneOf.properties[tag]={type:'string', title: "Path for "+metadatum.description}
			})
			plugin.schema.properties.peripherals.items.dependencies.mac_address.oneOf.push(oneOf)
		})
	}

	function startScanner(){
		bluetooth.getAdapter(app.settings?.btAdapter??adapterID).then(async (adapter) => {
			app.debug("Starting scan...");
			try { 
				await adapter.startDiscovery()
			}
			catch (error) {
			}
			plugin.schema.description='Scanning for Bluetooth devices...'	
			setTimeout( () => {
				adapter.devices().then((macs)=>{
					app.debug(`Found: ${util.inspect(macs)}`)
					macs.forEach( (mac) => {
						adapter.waitDevice(mac,discoveryTimeout*1000).then( async (sensor)=>{
							if (!sensorMap.has(mac)){
								let s = await instantiateSensor(sensor) 
								sensorMap.set(mac,s)
								addSensorToList(s)
							}
						})
						.catch ((e)=> {
							app.debug(e)
						})
					})
					plugin.schema.description=`Scan complete. Found ${macs.length} Bluetooth devices.`
				})
				plugin.uiSchema.peripherals['ui:disabled']=false	
				updateSensorsProperties()		
			}, app.settings?.btDiscoveryTimeout ?? discoveryTimeout * 1000)
		})
	}
	loadClassMap()
	updateAdapters()
	startScanner()
	plugin.start = async function (options, restartPlugin) {
		if (starts>0){
			app.debug('Plugin restarted');
			plugin.uiSchema.peripherals['ui:disabled']=true			
			loadClassMap()
			startScanner()
		} else {
			app.debug('Plugin started');
		}
		starts++
		const adapter = await bluetooth.getAdapter(options?.adapter??app.settings?.btAdapter??adapterID)
		peripherals=options.peripherals
		if (!(peripherals===undefined)){
			var found = 0
			for (const peripheral of peripherals) {
					
				app.setPluginStatus(`Waiting on ${peripheral.mac_address}`);
				adapter.waitDevice(peripheral.mac_address,1000*peripheral.discoveryTimeout).then(async (sensor)=>
				{
					if (!sensorMap.has(peripheral.mac_address)){
						peripheral.sensor = await instantiateSensor(sensor)
						sensorMap.set(peripheral.mac_address,peripheral.sensor)
						addSensorToList(peripheral.sensor)
					} else {
						peripheral.sensor=sensorMap.get(peripheral.mac_address)
					}

					if (peripheral.active) {

						createPaths(peripheral)
						await peripheral.sensor.connect();
						peripheral.sensor.getMetadata().forEach((metadatum, tag)=>{
							const path = peripheral[tag];
							if (!(path === undefined))
								peripheral.sensor.on(tag, (val)=>{
									updatePath(path,val)
							})
						})
						app.debug('Device: '+await peripheral.sensor.getDisplayName()+' connected.')
						app.setPluginStatus(`Connected to ${found++} sensors.`);
					}
				})
				.catch ((e)=> {
					if (peripheral.sensor)
							peripheral.sensor.disconnect()		
						app.debug("Unable to connect to device " + peripheral.mac_address +". Reason: "+ e.message )								
					})
				.finally( ()=>{
					app.setPluginStatus(`Connected to ${found} sensors.`);				
				}
				)
			}
		}

	} 
	plugin.stop = async function () {
		var adapter = await bluetooth.getAdapter(app.settings?.btAdapter??adapterID)

		if (adapter && await adapter.isDiscovering()){
			try{await adapter.stopDiscovery()} catch (e){
				app.debug(e.message)
			}
		}
		if (!(peripherals === undefined)){
			for (p of peripherals) {
				if (p.sensor) 
					p.sensor.disconnect()
			} 
		}
		//destroy();
		app.debug('BT Sensors plugin stopped');
	}
	
	return plugin;
}
