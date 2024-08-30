const fs = require('fs')
const util = require('util')
const path = require('path')
const {createBluetooth} = require('node-ble')
const {bluetooth, destroy} = createBluetooth()

const {loadSubclasses} = require ('./ClassLoader.js')
const BTSensor = require('./BTSensor.js')
const { setInterval } = require('timers/promises')
var peripherals=[]
module.exports =  function (app) {
	function createPaths(paths){
		for (const path of paths) {
			app.handleMessage(plugin.id, 
		  	{
		   	updates: [{ meta: [{path: path.sk_path, 
							  value: { units: path.sk_data_type }}]}]
		  	}
			)
		}
  	}

	function updatePath(path, val){
		app.handleMessage(plugin.id, {updates: [ { values: [ {path: path.sk_path, value: val }] } ] })
  	}  

	app.debug('Loading plugin')
	
	const discoveryTimeout = 30
	const adapterID = 'hci0'
	const classMap = loadSubclasses(path.join(__dirname, 'sensor_classes'))
	
	var plugin = {};

	plugin.id = 'bt-sensors-plugin-sk';
	plugin.name = 'BT Sensors plugin';
	plugin.description = 'Plugin to communicate with and update paths to BLE Sensors in Signalk';
	plugin.schema = {			
		type: "object",
		description: "",
		properties: {
			adapter: {title: "Bluetooth Adapter", type: "string",default:'hci0' },
			discoveryTimeout: {title: "Initial scan timeout (in seconds)", type: "number",default: 45 },
			peripherals:  
				{ type: "array", title: "Sensors", items:{
					title: "", type: "object",
					properties:{
						mac_address: {title: "MAC Address", enum: [], type: "string" },
						BT_class:  {title: "Bluetooth sensor class", type: "string", enum: [...classMap.keys()]},
						discoveryTimeout: {title: "Discovery timeout (in seconds)", type: "number", default:30},
						active: {title: "Active", type: "boolean", default: true },
						paths: {type: "array", title: "Signalk Paths", items: { 
							title: "", type: "object", properties:{
								id: {title: "ID", type: "string" },
								sk_path: {title: "Signalk K Path", type: "string" },
								sk_data_type : {title:"Signal K Type", type:"string"  }
							}
						}}
					}
				}
			}
		}
	}
	
	function addDeviceToList( device ){
		const deviceSet = new Set( plugin.schema.properties.peripherals.items.properties.
			mac_address.enum)

		deviceSet.add( device )
		plugin.schema.properties.peripherals.items.properties.
		mac_address.enum = Array.from(deviceSet.values())
	}

	bluetooth.getAdapter(app.settings?.btAdapter??adapterID).then(async (adapter) => {
		app.debug("Starting scan...");
		try { 
			await adapter.startDiscovery()
		}
		catch (error) {
		}
		plugin.schema.description='Scanning for Bluetooth devices...'	
		setTimeout(() => {
			adapter.devices().then((devices) => {
				devices.forEach(device => {
					addDeviceToList(device)
				})
				app.debug(`Found: ${util.inspect(devices)}`)
				plugin.schema.description=`Scan complete. Found ${devices.length} Bluetooth devices.`
			})
		}, app.settings?.btDiscoveryTimeout ?? discoveryTimeout * 1000)
	})
	
	
	plugin.start = async function (options, restartPlugin) {
		app.debug('Plugin started');

		const adapter = await bluetooth.getAdapter(options?.adapter??app.settings?.btAdapter??adapterID)
		peripherals=options.peripherals
		if (!(peripherals===undefined)){
			var found = 0
			for (const peripheral of peripherals) {
				addDeviceToList(peripheral.mac_address)
				if (!peripheral.active) continue;
				createPaths(peripheral.paths)
				app.setPluginStatus(`Connecting to ${peripheral.mac_address}`);

				adapter.waitDevice(peripheral.mac_address,1000*peripheral.discoveryTimeout).then((device)=>
				{
					var deviceClass = classMap.get(peripheral.BT_class)
					if (!deviceClass)
						throw new Error(`File for Class ${peripheral.BT_class} not found.`)
					
					peripheral.sensor = new deviceClass(device);
					peripheral.sensor.connect();		
					for (const path of peripheral.paths){
						if (!deviceClass.hasDataID(path.id))
							throw new Error(`Invalid path configuration. \'${path.id}\' not handled, must be one of ${peripheral.deviceClass.events()} `)
						peripheral.sensor.on(path.id, (val)=>{
							updatePath(path,val)
						})
					}
					app.debug('Device: '+peripheral.mac_address+' connected.')
					app.setPluginStatus(`Connected to ${found++} sensors.`);
				})
				.catch ((e)=> {
					if (peripheral.sensor)
							peripheral.sensor.disconnect()		
						app.debug("Unable to connect to device " + peripheral.mac_address +". Reason: "+ e.message )								
					})
				.finally( ()=>{
					app.setPluginStatus(`Connected to ${found} sensors.`);				
				})
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
