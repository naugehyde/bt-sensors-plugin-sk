# BT Sensors Plugin for [Signal K](http://www.signalk.org)


## WHAT IT IS

BT Sensors Plugin for Signalk is a lightweight BLE (Bluetooth Low Energy) framework for connecting to Bluetooth sensors on your boat and sending deltas to Signalk paths with the values the sensors reports. <br>

A typical use case is a Bluetooth thermometer like the Xiaomi LYWSD03MMC, an inexpensive Bluetooth thermometer that runs on a 3v watch battery that can report the current temperature and humidity in your refrigerator or cabin or wherever you want to stick it (no judgement.) <br>

The reported temperature can then be displayed on a Signalk app like Kip or, with appropiate mapping to NMEA-2000, a NMEA 2000 Multi-function display. 

The Plugin currently supports the Xiaomi LYWSD03MMC, [ATC](https://github.com/atc1441/ATC_MiThermometer) flashed LYWSD03MMCs, Victron SmartShunt and the Inkbird IBS-TH2 thermometer.

Sounds like meager offerings but it's pretty easy to write and deploy your own sensor class for any currently unsupported sensor. More on that in [the development section](#development).

## WHO IS IT FOR

Signalk users with a Linux boat-puter (Windows and MacOS are NOT supported) and Bluetooth sensors they'd like to integrate into their Signalk datastream.

## ALTERNATIVES

An [MQTT](https://mqtt.org/) server with an appropriate SK client plugin. There are several MQTT plugin clients in the Signalk appstore. 

Advantages of this plugin over an MQTT server and client plugin are:
* simplicity of setup
* reduced overhead on server
* one less piece of software to maintain on your boat-puter
* ease of rolling your own sensor classes

The key advantages of an MQTT setup is comprehensive support for BT devices and non-Linux platforms. 

## REQUIREMENTS

* A  Linux Signalk boat-puter with System-D (NOTE: Most Linux installations support System-D)
* A Bluetooth adapter
* [Bluez](https://www.bluez.org) installed
(Go here for [Snap installation instructions](https://snapcraft.io/bluez))
* [Node-ble](https://www.npmjs.com/package/node-ble) (installs with the plugin)

## INSTALLATION
### Signalk Appstore
This will be the recommended installation when the code is ready for wider sharing. In the meantime, use the platform-specific developer install instructions below.

### Linux
From a command prompt:<br>

<pre>  cd ~/[some_dir]
  git clone https://github.com/naugehyde/ping-ac-outlet-plugin-sk
  cd ping_ac_outlet_plugin_sk
  npm i
  [sudo] npm link
  cd [signalk_home] 
  npm link ping-ac-outlet-plugin-sk</pre>

Finally, restart SK. Plugin should appear in your server plugins list.<br>

> NOTE: "~/.signalk" is the default signalk home on Linux. If you're 
> getting permissions errors executing npm link, try executing "npm link" under sudo.

## CONFIGURATION

After installing and restarting Signalk you should see a "BT Sensors Plugin" option in the Signalk->Server->Plugin Config page.<br><br>

<img width="1135" alt="Screenshot 2024-09-01 at 8 35 34 PM" src="https://github.com/user-attachments/assets/7e5b7d87-92e3-4fcd-8971-95ef6799c62f"><br><br>

On initial configuration, wait 45 seconds (by default) for the Bluetooth device to complete its scan of nearby devices. Until the scan is complete, the Sensors section will be disabled. When the scan is complete your screen should look something like this:<br><br>

<img width="378" alt="Screenshot 2024-08-30 at 11 21 39 AM" src="https://github.com/user-attachments/assets/6e24b880-7ee7-4deb-9608-fb42d9db74f7"><br><br>

> TIP: If after 45 seconds (or whatever your Initial Scan Timeout is set to) you don't see "Scan completed. Found x Bluetooth devices." atop the config screen and the Sensors section is still disabled, close and re-open the config screen to refresh the screen. The config screen isn't as <i>reactive</i> as it oughtta be.<br><br>

Then press the + button to add a sensor. Your screen should look like this:<br><br>

<img width="1116" alt="Screenshot 2024-09-01 at 8 47 53 PM" src="https://github.com/user-attachments/assets/6fdab5cc-ab01-4441-a88f-2753a49aadbd">
<br><br>

Then select the sensor you want to connect to from the drop down.<br>

>TIP: If you need to rescan, disable and re-enable the plugin or restart Signalk.<br><br>

<img width="1109" alt="Screenshot 2024-09-01 at 8 48 04 PM" src="https://github.com/user-attachments/assets/264a8737-8c0e-4b34-a737-e0d834b54b99">
<br><br>

Then select the class of bluetooth device. The class should have a similar name to the device. If you don't see the class for your device, you can develop your own (check out [the development section](#development).). <br><br>

<img width="1104" alt="Screenshot 2024-09-01 at 8 48 19 PM" src="https://github.com/user-attachments/assets/b55ac065-6c57-48eb-8321-e40138d1ca99"><br><br>

Then it's a simple matter of associating the data emitted by the sensor with the Signalk path you want it to update. In the example pictured here there are three data points (temperature, humidity and sensor voltage). Other classes will expose different data.

<img width="1107" alt="Screenshot 2024-09-01 at 8 48 38 PM" src="https://github.com/user-attachments/assets/cb5aeb01-2e9a-44b3-ac3a-401cd7d6c3e7"><br><br>

Remember to hit the submit button. 

The plugin doesn't need for Signalk to restart but restart if that makes you more comfortable.

## NOW WHAT?

You should see data appear in your data browser. Here's a screenshot of Signalk on my boat displaying battery data from a Victron SmartShunt. <br><br>

<img width="1142" alt="Screenshot 2024-09-01 at 9 14 27 PM" src="https://github.com/user-attachments/assets/80abbc1c-e01e-4908-aa1a-eec83679cd7c"><br><br>

You can now take the data and display it using Kip, or route it to NMEA-2K and display it on a N2K MFD, or use it to create and respond to alerts in Node-Red. Life is good. So good.

# <a name="development"></a>BLUETOOTH SENSOR CLASS DEVELOPMENT

The goal of this project is to support as many mariner-useful sensors as possible. If there's anything we can do to make sensor class development easier, please let us know.<br><br>

## REQUIREMENTS

* programming knowledge, preferably class programming in Nodejs
* familiarity with [Node-ble](https://www.npmjs.com/package/node-ble) 
* ideally, the device manufacturer's specification for their bluetooth API
* failing the above, a willingness to hack or at the very least google aggressively

## PROGRAMMING PROCESS

### Discovery

You'll first need to know what data your sensor produces and the means by which it provides data (GATT Server or advertisement) and the details thereof.<br><br>

The first approach is to see if the device manufacturer has documented this. Not all do. Don't worry if you can't find OEM docs, it's likely someone on the internet has figured out your device's whys and wherefores for you already. Google that thang. <br><br>

If you're still coming up empty, there are any number of tools you can use to examine the Bluetooth data stream of your device. <br><br>

* bluetoothctl (installed with Bluez on Linux)
* [NRF Connect](https://play.google.com/store/apps/details?id=no.nordicsemi.android.mcp&hl=en_US)

With these tools you can see what data your device advertises, and what data it provides via a connection to its GATT Server. <br><br>

### Coding

#### Get the code

To get the code you'll first need to clone this repository then create a branch. That's git talk. Google it if you don't know what that means.<br>

Once you've done that you're ready for...

#### Actual coding

Below is a simple Device class for the Xiaomi thermometer with stock firmware. The code demonstrates the core responsibilities of a Bluetooth sensor device class in the BT-Sensor-plugin's framework:

* resides in the sensor_classes subdirectory
* extends the BTSensor class
* provides metadata for the device's various data points (the static metadata class member)
* overrides the BTSensor::connect() and disconnect() methods
* emits values for each data point
* exports the class
    
<pre>const BTSensor = require("../BTSensor");

class LYWSD03MMC extends BTSensor{

    static needsScannerOn(){
        return false
    }
    static metadata = new Map()
                    .set('temp',{unit:'K', description: 'temperature'})
                    .set('humidity',{unit:'ratio', description: 'humidity'})
                    .set('voltage',{unit:'V', description: 'sensor battery voltage'})

    constructor(device){
        super(device)
    }

    emitValues(buffer){
        this.emit("temp",((buffer.readInt16LE(0))/100) + 273.1);
        this.emit("humidity",buffer.readUInt8(2)/100);
        this.emit("voltage",buffer.readUInt16LE(3)/1000);
    }

    async connect() {
        await this.device.connect()
        var gattServer = await this.device.gatt()
        var gattService = await gattServer.getPrimaryService("ebe0ccb0-7a0a-4b0c-8a1a-6ff2997da3a6")
        var gattCharacteristic = await gattService.getCharacteristic("ebe0ccc1-7a0a-4b0c-8a1a-6ff2997da3a6")
        this.emitValues(await gattCharacteristic.readValue())
        await gattCharacteristic.startNotifications();	
        gattCharacteristic.on('valuechanged', buffer => {
            this.emitValues(buffer)
        })
    }
    async disconnect(){
        super.disconnect()
        await this.device.disconnect()
    }
}
module.exports=LYWSD03MMC</pre>

Most of the work is done in the connect() method. In this case, the connect() method creates a connection to the device:
<pre>await this.device.connect()</pre> 
Then it gets the device's gattServer and primary service:
<pre>
 var gattServer = await this.device.gatt()
 var gattService = await gattServer.getPrimaryService("ebe0ccb0-7a0a-4b0c-8a1a-6ff2997da3a6")
 </pre>
 Then, it requests the device's "characteristic" that will send us data.
 <pre>var gattCharacteristic = await gattService.getCharacteristic("ebe0ccc1-7a0a-4b0c-8a1a-6ff2997da3a6")</pre>
 Then it asks the characteristic for notifications when its value changes.
 <pre>await gattCharacteristic.startNotifications();</pre>
 Then most importantly it emits the values when the data has changed:
 <pre>gattCharacteristic.on('valuechanged', buffer => {
            this.emitValues(buffer) 
  })</pre>
  In this implementation, the emitValues member function does the work of parsing the buffer and emitting the values. 
  <pre>    
   emitValues(buffer){
        this.emit("temp",((buffer.readInt16LE(0))/100) + 273.1);
        this.emit("humidity",buffer.readUInt8(2)/100);
        this.emit("voltage",buffer.readUInt16LE(3)/1000);
   }
  </pre>
NOTE: If you guessed that the plugin listens to changes to device objects and then publishes the deltas, you guessed right.
 
### All that said
The problem with Gatt Server devices is they stay connected and eat up a lot of energy, draining your device's batteries. You can deactivate the device from the config screen when it's not in use or in this case you can flash the device with custom firmware that changes the device to a broadcast device that advertises its data obviating the need for a battery-draining connection. In the case of Xiaomi LYWSD03MMC you can flash it with some very useful software called [ATC](https://github.com/atc1441/ATC_MiThermometer?tab=readme-ov-file) </pre>

Below is an example of a BTSensor subclass that uses the advertising protocol to get the data from a flashed Xiaomi thermometer.

<pre>const BTSensor = require("../BTSensor");
const LYWSD03MMC = require('./LYWSD03MMC.js')
class ATC extends BTSensor{

    constructor(device){
        super(device)
    }

    static metadata = LYWSD03MMC.metadata
    
    connect() {
        const cb = async (propertiesChanged) => {
            try{
                this.device.getServiceData().then((data)=>{             
                    //TBD Check if the service ID is universal across ATC variants
                    const buff=data['0000181a-0000-1000-8000-00805f9b34fb'];
                    this.emit("temp",((buff.readInt16LE(6))/100) + 273.1);
                    this.emit("humidity",buff.readUInt16LE(8)/10000);
                    this.emit("voltage",buff.readUInt16LE(10)/1000);
                })
            }
            catch (error) {
                throw new Error(`Unable to read data from ${util.inspect(device)}: ${error}` )
            }
        }
        cb();
        this.device.helper.on('PropertiesChanged', cb)
    }
}
module.exports=ATC</pre>

The big difference here is in the connect() method. All it does is wait on propertiesChanged and when that event occurs, the device object parses the buffer and emits the data. NOTE: Both classes have the same metadata, so the ATC class "borrows" the metadata from the LYWSD03MMC class.<br>

## LET US KNOW

When you're done working on your class and satisified that it's functioning properly, commit and request a merge (more git talk).<br>

We love to see new sensor classes!

  
  
 
