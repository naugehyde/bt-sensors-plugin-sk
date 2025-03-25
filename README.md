# Bluetooth Sensors for [Signal K](http://www.signalk.org)

## BETA 2.2.3
### What's New
Support for [JBD/Jiabaida/Xiaoxiang Battery management systems](https://jiabaida-bms.com/), IBeacon and clone devices courtesy of [Arjen R](https://github.com/ArjenR). 

### What's New for Developers
Runtime loading of external device modules. See (https://github.com/naugehyde/bt-sensors-plugin-sk/discussions/26) 
## BETA 2.2.2
### What's New
Support for Lancol Battery Meters, Kilovault HLX+ smart batteries courtesy of [sdlee1963](https://github.com/sdlee1963) and baseline  support for BTHome devices as well as support for the ShellySBHT003C enviromental sensor courtesy of [Sebastian Haas](https://github.com/sebastianhaas) 

Fixed incorrect reporting of Victron Battery Monitor -> aux temperature values. 

## BETA 2.2.1

### What's New

GoveeH50xx sensor support. Selectable bluetooth adapter on config screen (in case you have more than bluetooth adapter on your server).


## BETA 2.2.0

### What's New

Support for Aranet4 environment sensor and Renogy Rover/Wanderer Controllers. Untested support for Renogy Battery and Inverter clients. If you have a Renogy Battery or Inverter with bluetooth support, please give it a try and let me know how it goes. 

### RENOGY NOTES 

The class of Renogy Devices cannot be reliably identified from their Bluetooth advertisements. <br>

On the plugin config page, You will need to select the device from the Device dropdown, then select the appropriate class from the Class dropdown. After that, you will need to hit the Submit button. On restart of the plugin, the plugin should recognize the device. If you've selected the appropriate class (RenogyRoverClient for example), you should see configs for paths. <br>


## WHAT IT IS

BT Sensors Plugin for Signalk is a lightweight BLE (Bluetooth Low Energy) framework for listening and connecting to Bluetooth sensors on your boat and sending deltas to Signalk paths with the values the sensors reports. <br>

The Plugin currently supports every documented Victron device (AC Charger, Battery Monitor, DC-DC Converter, DC Energy Meter, GX Device, Inverter, Inverter RS, Lynx Smart BMS, Orion XS, Smart Battery Protect, Smart Lithium and VE Bus),  [Lancol Battery Meters ](https://www.lancol.com/product/12v-bluetooth-4-0-battery-tester-micro-10-c/), [Kilovault HLX+ smart batteries ](https://sunwatts.com/content/manual/KiloVault_HLX_PLUS_Datasheet_06252021%20%281%29.pdf?srsltid=AfmBOooY-cGnC_Qm6V1T9Vg5oZzBCJurS0AOGoWqWeyy-dwz2vA-l1Jb), Xiaomi devices, [ATC devices](https://github.com/atc1441/ATC_MiThermometer), RuuviTags, Renogy BMS, Ultrasonic Wind Meters, SwitchBotTH and Meterplus, Aranet 2/4 environmental sensors, Govee 50/51xx sensors, and Inkbird thermometers.

A typical use case is a Bluetooth thermometer like the Xiaomi LYWSD03MMC, an inexpensive Bluetooth thermometer that runs on a 3V watch battery that can report the current temperature and humidity in your refrigerator or cabin or wherever you want to stick it (no judgement.) <br>

The reported temperature can then be displayed on a Signalk app like Kip, WilhelmSK or, with appropiate mapping to NMEA-2000, a NMEA 2000 Multi-function display. 

It's pretty easy to write and deploy your own sensor class for any currently unsupported sensor. More on that in [the development README](./sensor_classes/DEVELOPMENT.md).

## WHO IS IT FOR

Signalk users with a Linux boat-puter (Windows and MacOS are NOT currently supported) and Bluetooth sensors they'd like to integrate into their Signalk datastream.

## REQUIREMENTS

* A Linux Signalk boat-puter with bluetooth-DBUS support 
* A Bluetooth adapter
* [Bluez](https://www.bluez.org) installed
(Go here for [Snap installation instructions](https://snapcraft.io/bluez))
* [Node-ble](https://www.npmjs.com/package/node-ble) (installs with the plugin)

## INSTALLATION

NOTE: If you're running the 1.0.3 release, you will have to reconfigure your devices.<br>

### Signalk Appstore
The plugin is currently available in the Signalk Appstore. <br>

### NPM

Go to you signalk home (usually ~/.signalk) and run:

npm i bt-sensors-plugin-sk@1.1.0-beta.2.1

### Linux

If you want to install directly from source (this is mostly of interest to custom sensor class developers) execute the following from a command prompt:<br>

<pre>  cd ~/[some_dir]
  git clone https://github.com/naugehyde/bt-sensors-plugin-sk
  cd bt-sensors-plugin-sk
  git switch '1.1.0'
  git pull
  npm i
  [sudo] npm link
  cd [signalk_home] 
  npm link bt-sensors-plugin-sk</pre>

Finally, restart SK. Plugin should appear in your server plugins list.<br>

> NOTE: "~/.signalk" is the default signalk home on Linux. If you're 
> getting permissions errors executing npm link, try executing "npm link" under sudo.

## CONFIGURATION

After installing and restarting Signalk you should see a "BT Sensors Plugin" option in the Signalk->Server->Plugin Config page.<br><br>

<img width="1130" alt="Screenshot 2024-10-13 at 6 50 09 PM" src="https://github.com/user-attachments/assets/4180504e-1ca8-48af-babf-899486fb0a24"><br><br>

On initial configuration, wait for your Bluetooth adapter to scan devices. The plugin will scan for new devices at whatever you set the "scan for new devices interval" value to. <br><br>

> TIP: Close and re-open the config screen to refresh the screen. The config screen isn't as <i>reactive</i> as it oughtta be.<br><br>

Then press the + button to add a sensor. Your screen should look something like this:<br><br>
<img width="1122" alt="Screenshot 2024-10-13 at 6 52 52 PM" src="https://github.com/user-attachments/assets/0487b8d0-4bc0-4358-85c6-a507bc3c97d2">

<br><br>

Select the sensor you want Signalk to listen to from the drop down.<br>

If you don't see your device and you know that it's on and nearby to the server, it may not be currently supported. But fear not, you can add custom sensor classes yourself. (Check out [the development section](#development).). <br><br>

Now it's a simple matter of associating the data emitted by the sensor with the Signalk path you want it to update. (Also, you can name your sensor so when it appears in logs its easy to recognize.) <br><br>

<img width="1125" alt="Screenshot 2024-10-13 at 9 30 53 PM" src="https://github.com/user-attachments/assets/5284539e-d5ee-488f-bbab-901258eb1c0b">

The plugin doesn't need for Signalk to restart after submitting your config but restart if that makes you more comfortable. <br><br>

### ADVERTISED DATA

Most supported Bluetooth sensors broadcast (or advertise) their device's data without an explicit connection. Some devices broadcast their data encrypted. Supported devices with encrypted advertised data will allow you to input the encryption key as a config parameter. NOTE: the encryption key is currently stored on the server in plain text. 

### GATT CONNECTIONS

If you see something like this on your device config:

<img width="727" alt="Screenshot 2024-10-13 at 9 42 26 PM" src="https://github.com/user-attachments/assets/65fe1aa7-99a5-41ac-85dc-cfde00e95932">

You have the option of making a GATT Connection to your device. A GATT Connection is energy-inefficient but serves data from your device in more or less real-time. To learn more about GATT check out: https://learn.adafruit.com/introduction-to-bluetooth-low-energy/gatt

## NOW WHAT?

You should see data appear in your data browser. Here's a screenshot of Signalk on my boat displaying battery data from a Victron SmartShunt. <br><br>

<img width="1142" alt="Screenshot 2024-09-01 at 9 14 27 PM" src="https://github.com/user-attachments/assets/80abbc1c-e01e-4908-aa1a-eec83679cd7c"><br><br>

You can now take the data and display it using Kip, WilhelmSK or route it to NMEA-2K and display it on a N2K MFD, or use it to create and respond to alerts in Node-Red. Isn't life grand?


  
  
 
