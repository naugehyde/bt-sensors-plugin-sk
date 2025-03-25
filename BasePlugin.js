class BasePlugin {
    constructor(app){
      this.app=app
	  
      this.schema = {			
		type: "object",
		description: "NOTE: \n 1) Plugin must be enabled to configure your sensors. \n"+
		"2) You will have to wait until the scanner has found your device before seeing your device's config fields and saving the configuration. \n"+
		"3) To refresh the list of available devices and their configurations, just open and close the config screen by clicking on the arrow symbol in the config's top bar. \n"+
		"4) If you submit and get errors it may be because the configured devices have not yet all been discovered.",
		required:["adapter","discoveryTimeout", "discoveryInterval"],
		properties: {
			adapter: {title: "Bluetooth adapter",
				type: "string", default: "hci0"},

			discoveryTimeout: {title: "Default device discovery timeout (in seconds)", 
				type: "integer", default: 30,
				minimum: 10,
				maximum: 3600 
			},
			discoveryInterval: {title: "Scan for new devices interval (in seconds-- 0 for no new device scanning)", 
				type: "integer", 
				default: 10,
				minimum: 0,
				multipleOf: 10
			 },
			peripherals:
				{ type: "array", title: "Sensors", items:{
					title: "", type: "object",
					required:["mac_address", "discoveryTimeout"],
					properties:{
					active: {title: "Active", type: "boolean", default: true },
					mac_address: {title: "Bluetooth Sensor",  type: "string" },
					discoveryTimeout: {title: "Device discovery timeout (in seconds)", 
						type: "integer", default:30,
						minimum: 10,
						maximum: 600 },
                    
                    paths: { title: "SignalK Path Map", type: "object", properties:{
                        rssi: {type: "string", title: "Device signal strength (RSSI)"}
                        }
                    },
                    params:
                    { type: "object", title: "Parameters", properties:{

                    }
                    },
                    gattParams:
                    { type: "object", title: "GATT Specific Parameters", properties:{
                        useGATT: {title: "Use GATT", type: "boolean", default: false },
                        gattRefresh: {title: "GATT Refresh Interval (seconds)", type: "integer", default: 0 },
                    }
                    }
				}
				}	
			},
	

        },
		
		}
	
    }
  
    start (settings, restartPlugin)  {
      this.btm=this.app.getSelfPath("__bluetooth-manager__").value
    
    }
    stop()  {
      if (this.btm)
        this.btm.removeAllListeners(this)
    }
  
  }

  
  module.exports = BasePlugin