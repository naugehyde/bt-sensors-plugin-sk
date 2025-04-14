# BLUETOOTH SENSOR CLASS DEVELOPMENT (OUT OF DATE AS OF 1.1.0 release, NEW VERSION COMING IN 1.2.0)

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

## DEVICE MODULES

To learn more about runtime loading of device modules, see (https://github.com/naugehyde/bt-sensors-plugin-sk/discussions/26) 


## LET US KNOW

When you're done working on your class and satisified that it's functioning properly, commit and request a merge (more git talk).<br>

We love to see new sensor classes!
