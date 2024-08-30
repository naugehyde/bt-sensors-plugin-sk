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

* Signalk boat-puter running under Linux
* [Node-ble](https://www.npmjs.com/package/node-ble) (installs automatically)
* A supported Bluetooth sensor

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

After installing and restarting Signalk you should see

