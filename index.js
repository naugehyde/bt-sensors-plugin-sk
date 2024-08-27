const fs = require('fs')
const util = require('util')
const path = require('path')
const {createBluetooth} = require('node-ble')
const {bluetooth, destroy} = createBluetooth()

const {loadSubclasses} = require ('./ClassLoader.js')
const BTSensor = require('./BTSensor.js')

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports =  function (app) {
	var plugin = {};
  	var peripherals;

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
 
	plugin.id = 'bt-sensors-plugin-sk';
	plugin.name = 'BT Sensors plugin';
	plugin.description = 'Plugin to communicate with and update paths to BLE Sensors in Signalk';
	plugin.schema = {			
		type: "object",
		description: "",
		properties: {
			adapter: {title: "Bluetooth Adapter", type: "string",default:'hci0' },
			discoveryTimeout: {title: "Initial scan timeout (in seconds)", type: "number",default: 45 }
		}
	}
	var adapter;
	var devices = []

  	const classMap = loadSubclasses(path.join(__dirname, 'sensor_classes'))

  	plugin.start =  async function (options, restartPlugin) {
		peripherals = options.peripherals
		app.debug('Plugin started');
		adapter = await	bluetooth.getAdapter(options.adapter) 
		
		app.debug("Starting scan...");
		await adapter.startDiscovery();
		for (let i = options.discoveryTimeout; i>0; i--){
			app.setPluginStatus(`Scanning for devices... ${i}`);
			await sleep(1000);
		}
		devices= await adapter.devices()
		app.debug(`Found: ${util.inspect(devices)}`)
	
		if(options.peripherals)
			for (const peripheral of options.peripherals)
				if (!devices.find(({ mac }) => mac === peripheral.mac_address))
					devices.push(peripheral.mac_address)
		
	
		plugin.schema.properties.peripherals =  
		{ type: "array", title: "Sensors", items:{
			title: "", type: "object",
			properties:{
				mac_address: {title: "MAC Address", enum: devices, type: "string" },
				BT_class:  {title: "Bluetooth sensor class", type: "string", enum: [...classMap.keys()]},
				discoveryTimeout: {title: "Discovery timeout (in seconds)", type: "number", default:30},
				active: {title: "Active", type: "boolean", default: true },
				paths: {type: "array", title: "", items: { 
					title: "Paths", type: "object", properties:{
						id: {title: "ID", type: "string", default: true },
						sk_path: {title: "Signalk K Path", type: "string" },
						sk_data_type : {title:"Signal K Type", type:"string"  }
					}
				}}
			}
		}
		}

		var keepScanning = false
		var found = 0
		if (options.peripherals){
			for (const peripheral of options.peripherals) {
				if (peripheral.active) {
					createPaths(peripheral.paths)
					try {
						app.setPluginStatus(`Waiting on ${peripheral.mac_address}`);

						var device = await adapter.waitDevice(peripheral.mac_address,1000*peripheral.discoveryTimeout)
						var deviceClass = classMap.get(peripheral.BT_class)
						if (!deviceClass){
							throw new Error(`File for Class ${peripheral.BT_class} not found.`)
						}
						keepScanning ||= deviceClass.needsScannerOn()
						peripheral.sensor = new deviceClass(device);
						
						for (const path of peripheral.paths){
							if (!deviceClass.events().find((e) => e == path.id))
								throw new Error(`Invalid path configuration. \'${path.id}\' not handled, must be one of ${deviceClass.events()} `)
							peripheral.sensor.on(path.id, (val)=>{
								updatePath(path,val)
							})
						}
						peripheral.sensor.connect();				
						app.debug('Device: '+peripheral.mac_address+' connected.')
						found++
							
					} catch (e) {
						if (peripheral.sensor)
							peripheral.sensor.disconnect()

						app.debug("Unable to initialize device " + peripheral.mac_address +". Reason: "+ e.message )								
					}
				}
			}
		}
		if (!keepScanning) {
			try{
				app.debug("Stopping scan");
				await adapter.stopDiscovery()
			} catch(e) {
				app.debug(e.message)
			}
		}
		app.setPluginStatus(`Connected to ${found} sensors.`);

	} 
	plugin.stop = async function () {

		if (adapter && await adapter.isDiscovering()){
			try{await adapter.stopDiscovery()} catch (e){
				app.debug(e.message)
			}
		}
		if (peripherals){
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
