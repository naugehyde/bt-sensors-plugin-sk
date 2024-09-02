const fs = require('fs')
const util = require('util')
const path = require('path')
const {createBluetooth} = require('node-ble')
const {bluetooth, destroy} = createBluetooth()

const BTSensor = require('./BTSensor.js')
const utilities_sk = require('../utilities-sk/utilities.js')

module.exports =  function (app) {
	var peripherals=[]
	var starts=0

	function createPaths(sensorClass, peripheral){

		for (const tag of sensorClass.metadataTags()) {
			const path = peripheral[tag]
			if (!(path===undefined))
				app.handleMessage(plugin.id, 
				{
				updates: 
					[{ meta: [{path: path, value: { units: sensorClass.unitFor(tag) }}]}]
				}
			)
		}
  	}

	function updatePath(path, val){
		app.handleMessage(plugin.id, {updates: [ { values: [ {path: path, value: val }] } ] })
  	}  

	function loadClassMap() {
		classMap = utilities_sk.loadSubclasses(path.join(__dirname, 'sensor_classes'))
	}

	app.debug('Loading plugin')
	
	const discoveryTimeout = 30
	const adapterID = 'hci0'
	var classMap
	var plugin = {};

	plugin.id = 'bt-sensors-plugin-sk';
	plugin.name = 'BT Sensors plugin';
	plugin.description = 'Plugin to communicate with and update paths to BLE Sensors in Signalk';
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
						BT_class:  {title: "Bluetooth sensor class", type: "string", enum: []},
						discoveryTimeout: {title: "Discovery timeout (in seconds)", type: "number", default:30},
					}, dependencies:{BT_class:{oneOf:[]}}
					
				}
			}
		}
	}
	
	function setDeviceNameInList(device,name){
		const deviceNames = plugin.schema.properties.peripherals.items.properties.
		mac_address.enumNames
		const devices = plugin.schema.properties.peripherals.items.properties.
		mac_address.enum

		deviceNames[devices.indexOf(device)]=`${name} (${device})` 
	}

	function addDeviceToList( device, name ){
		const devices = plugin.schema.properties.peripherals.items.properties.
		mac_address.enum

		if (!devices.includes(device)) {
			devices.push(device)
			if (!(name===undefined))
				setDeviceNameInList(device,name)
		}
	}
	async function getDeviceName(device){
		var dn = "UNKNOWN"
		try{
			dn = await device.getName()
		}
		catch (error) {}
		return dn
	}

	function updateAdapters(){
		bluetooth.adapters().then((adapters)=>
			{plugin.schema.properties.adapter.enum = adapters} 
		)
	}
	function updateClassProperties(){ 
		plugin.schema.properties.peripherals.items.properties.BT_class.enum=[...classMap.keys()]
		classMap.forEach(( cls, className )=>{
			var oneOf = {properties:{BT_class:{enum:[className]}}}
			cls.metadata.forEach((metadatum,tag)=>{
				oneOf.properties[tag]={type:'string', title: "Path for "+metadatum.description}
			})

			plugin.schema.properties.peripherals.items.dependencies.BT_class.oneOf.push(oneOf)
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
				adapter.devices().then((devices)=>{
					app.debug(`Found: ${util.inspect(devices)}`)
					devices.forEach( (device) => {
						adapter.waitDevice(device,discoveryTimeout*1000).then((d)=>{
							getDeviceName(d).then((dn)=>{
								addDeviceToList(device, dn )
							})
						})
					})
					plugin.schema.description=`Scan complete. Found ${devices.length} Bluetooth devices.`
				})
			}, app.settings?.btDiscoveryTimeout ?? discoveryTimeout * 1000)
		})
	}
	loadClassMap()
	updateAdapters()
	updateClassProperties()
	startScanner()
	plugin.start = async function (options, restartPlugin) {
		if (starts>0){
			app.debug('Plugin restarted');
			loadClassMap()
			updateClassProperties()
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
				
				addDeviceToList(peripheral.mac_address)				
				app.setPluginStatus(`Waiting on ${peripheral.mac_address}`);
				adapter.waitDevice(peripheral.mac_address,1000*peripheral.discoveryTimeout).then(async (device)=>
				{

					setDeviceNameInList(peripheral.mac_address, await getDeviceName(device))

					if (peripheral.active) {

						var sensorClass = classMap.get(peripheral.BT_class)
						if (!sensorClass)
							throw new Error(`File for Class ${peripheral.BT_class} not found.`)
						createPaths(sensorClass, peripheral)

		
						peripheral.sensor = new sensorClass(device);
						await peripheral.sensor.connect();		
						for (const tag of sensorClass.metadataTags()){
							const path = peripheral[tag];
							if (!(path === undefined))
								peripheral.sensor.on(tag, (val)=>{
									updatePath(path,val)
							})
						}
						app.debug('Device: '+peripheral.mac_address+' connected.')
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
				if (!p.sensor===undefined) 
					p.sensor.disconnect()
			} 
		}
		//destroy();
		app.debug('BT Sensors plugin stopped');
	}
	
	return plugin;
}
