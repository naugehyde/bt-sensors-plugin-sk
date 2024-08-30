# BT Sensors Plugin for [Signal K](http://www.signalk.org)


## WHAT IT IS

BT Sensors Plugin for Signalk is a lightweight BLE (Bluetooth Low Energy) framework for connecting to Bluetooth sensors on your boat and updating Signalk paths with the values the sensors reports. <br>

A typical use case is a Bluetooth thermometer like the Xiaomi LYWSD03MMC, an inexpensive Bluetooth thermometer that runs on a 1.5v watch battery that can report the current temperature and humidity in your refrigerator or cabin or wherever you want to stick it (no judgement.) <br>

The reported temperature can then be displayed on a Signalk app like Kip or, with appropiate mapping to NMEA-2000, a NMEA 2000 Multi-function display. 

The Plugin currently supports the Xiaomi LYWSD03MMC, [ATC](https://github.com/atc1441/ATC_MiThermometer) flashed LYWSD03MMCs, Victron SmartShunt and the Inkbird IBS-TH2 thermometer.

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

* A  Linux Signalk boat-puter with System-D
  ** NOTE: Most Linux installations will support System-D
* A Bluetooth adapter
* [Bluez](https://www.bluez.org) installed
  ** Go here for [Snap installation instructions](https://snapcraft.io/bluez)
* [Node-ble](https://www.npmjs.com/package/node-ble) (installs automatically)

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

NOTE: Simpler and easier configuration instructions will come with a Webapp configuration screen that hasn't been completed. Okay, not yet started. But that'll change.

After installing and restarting Signalk you should see a "BT Sensors Plugin" option in the Signalk->Server->Plugin Config page.<br><br>

<img width="1133" alt="Screenshot 2024-08-30 at 11 20 11 AM" src="https://github.com/user-attachments/assets/824b1b0b-cf51-4dc4-be64-4a1fa3e29eb3"><br><br>

On initial configuration, wait 45 seconds (default) for the Bluetooth device to complete its scan of nearby devices. When the scan is complete your screen should look something like this:<br><br>

<img width="378" alt="Screenshot 2024-08-30 at 11 21 39 AM" src="https://github.com/user-attachments/assets/6e24b880-7ee7-4deb-9608-fb42d9db74f7"><br><br>

Press + to add a new Sensor.<br><br>

<img width="1129" alt="Screenshot 2024-08-30 at 11 24 27 AM" src="https://github.com/user-attachments/assets/9007adf7-529f-4842-b717-ccc39a2c3499"><br><br>

Select the Mac Address of your sensor (NOTE: this part of the process will be made a LOT easier with the fancy Webapp configuration screen. But that's not gonna happen until I learn React programming. Which at my age takes time.)<br><br>

<img width="1106" alt="Screenshot 2024-08-30 at 11 32 56 AM" src="https://github.com/user-attachments/assets/5faa58b4-2f23-4367-a9a8-3f06f02c9727"><br><br>

Then select the class of bluetooth device. (NOTE: This will be largely automated in the future. A more comprehensive set of BT sensors will be available, too.)  

