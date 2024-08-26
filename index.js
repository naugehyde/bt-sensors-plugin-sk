const fs = require('fs')
const util = require('util')
const path = require('path')
const {createBluetooth} = require('node-ble')
const {bluetooth, destroy} = createBluetooth()
const {loadSubclasses} = require ('./ClassLoader.js')
const BTSensor = require('./BTSensor.js')


module.exports = function (app) {
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
  var adapter;
  const classMap = loadSubclasses(path.join(__dirname, 'sensor_classes'))

  
  plugin.start =  async function (options, restartPlugin) {

    app.debug('Plugin started');
	
    adapter = await bluetooth.getAdapter(options.adapter) 
    adapter.needsScan = false;

    try {
	app.debug("Starting scan aka discovery");
		await adapter.startDiscovery()
    } catch (e) {
		app.debug(e.message)
    }

    peripherals = options.peripherals
	app.debug(peripherals)
    for (const peripheral_config of peripherals) {
	if (peripheral_config.active) {

			createPaths(peripheral_config.paths)
			app.debug("Looking for device: "+peripheral_config.mac_address)
			adapter.waitDevice(peripheral_config.mac_address,1000*peripheral_config.discoveryTimeout)
			.then((device)=>{
				device.getName().then(name=>
					app.debug("Found device "+name))
				var deviceClass = classMap.get(peripheral_config.BT_class)
				if (typeof deviceClass == 'undefined'){
						throw new Error(`File for Class ${peripheral_config.BT_class} not found. `)
				}

				peripheral_config.sensor = new deviceClass(device);

				for (const path of peripheral_config.paths){
					peripheral_config.sensor.on(path.id, (val)=>{
						updatePath(path,val)
					})
				}
				peripheral_config.sensor.connect();				
			})
			.catch (e =>
				app.debug("Unable to find and connect device " + peripheral_config.mac_address +". Reason: "+ e.message )		
			)
		}
	}
 /*   if (!adapter.needsScan) {
    	try{
		app.debug("Stopping scan aka discovery");
		adapter.stopDiscovery()
   	 } catch(e) {
		app.debug(e.message)
    	}
    }*/

  }; // plugin.start()

  plugin.stop = async function () {

    if (adapter && await adapter.isDiscovering()){
	try{
	   await adapter.stopDiscovery()
	} catch (e){
           app.debug(e.message)
	}
    }
    if (peripherals){
      for (p of peripherals) {
		if (!(typeof p.sensor == 'undefined') )
			p.sensor.disconnect()
      } //for
    }
    destroy();
    app.debug('BT Sensors plugin stopped');
  }
/*
ServiceData: {
     '0000fcd2-0000-1000-8000-00805f9b34fb': Variant {
      signature: 'ay',
      value: <Buffer 40 00 13 01 64 02 93 06 03 9e 18>
   }
 } 
*/
  plugin.schema = {
    type: "object",
    description: "",
    properties: {
		adapter: {title: "BT Adapter", type: "string", default:"HCI0" },
      	peripherals: { type: "array", title: "Peripherals", items:{
        	title: "Peripheral", type: "object",
          	properties:{
				BT_class:  {title: "Bluetooth sensor class", type: "string", enum: [...classMap.keys()]},
            	mac_address: {title: "MAC Address", type: "string" },
	    		discoveryTimeout: {title: "Discovery timeout (in seconds)", type: "number", default:30},
   	    		active: {title: "Active", type: "boolean", default: true },
            	paths: {type: "array", title: "", items: { title: "Paths", type: "object", properties:{
		  			id: {title: "ID", type: "string", default: true },
                  	sk_path: {title: "Signalk K Path", type: "string" },
					sk_data_type : {title:"Signal K Type", type:"string"  }
                }
              }          
            }          
          }
        }
      }
    } 
  }
  return plugin;
}
