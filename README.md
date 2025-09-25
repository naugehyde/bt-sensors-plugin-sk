# Bluetooth Sensors for [Signal K](http://www.signalk.org) 

## WHAT'S NEW  
# Version 1.3.2

- Victron Alarm Reason improvements
- VictronOrionXS offReason text implementation
- Shelly Blu H&T description changes 

# Version 1.3.1

- JBD Protection status
- SensorPush devices (untested)

# Version 1.3.0

- JikongBMS support (aka JKBMS)
- EcoWorthyBW02 Batteries/BMS support (need testers)
- Ective, Topband, Skanbatt etc LiFePo4 BMS support (ective.de BMS manufacturer)
- FeasyCom BP108B support -- iBeacon/Eddystone protocols
- Refactored code for connected devices 
- Display connection/active state in config
- DBus resource issues addressed
- dbus-next package replaced with @jellybrick/dbus-next
- Improved reconnect logic for connected devices
- UI improvements for selecting Sensor Class (if available, paths appear immediately upon selection)
- Mopeka examples not defaults in config for underused paths
- Fix so no plugin restart required after selecting sensor class for an unidentified device
- Fixed Junctek chargeDirection at start (amps will not reported until chargeDirection is known)
- auxMode detection fixes for Victron SmartBatteryMonitor devices

# Version 1.2.5-1

- Reverted change from 1.2.5 to path's source field 
- Victron Sensor model ID and name improvements to constistency for VE Smart Networking enabled devices
- Improved initial startup responsiveness 

# Version 1.2.5

- On initial startup, plugin saves default configuration. Fixing the "missing" configured devices after restart.
- Mopeka Tank Sensor configuration fix
- Added number of found devices in a domain in the configuration screen's domain tab

# Version 1.2.4-4

Junctek support (tested)

# Version 1.2.4-3

- Mercury Smartcraft fixes (working now!)
- Govee 510x regression errors fixed

# Version 1.2.4-2

- RenogyRoverClient fix to Battery SOC calculation
- VictronBatteryMonitor set default aux mode to secondary voltage 
- SwitchBotTH and Meter Plus ::identify errors fixed
- MercurySmartcraft::identify method fix

# Version 1.2.4-1

- **NEW SENSOR** [Bank Manager](https://marinedcac.com/pages/bankmanager) (tested) 
- **NEW SENSOR** [Mercury Smartcraft](https://www.mercurymarine.com/us/en/gauges-and-controls/displays/smartcraft-connect) (untested)
- Fixed Govee 5075 parsing
- Added defaults for Renogy Rover Client
- Automatic reconnect for GATT connected devices

### Version 1.2.3

Bug fixes Remoran Wave.3, JunctekBMS, and ShenzhenLiOn

### Version 1.2.2

- Junctek BMS and Remoran Wave 3 support (Note: both are not currently field tested)

- Fixes to ShenzhenLiOn BMS, Victron Orion XS, Victron DC DC Converter, Victron Smart Lithium Classes

### Version 1.2.1

- Dynamic configuration screen. The Device list automatically updates when new devices are found by the BT scanner. (No more annoying screen refresh necessary!). 

- Sensors appear under tabs indicating their domain (Environmental, Electrical etc.)

- Support added for [Shelly Blu Motion sensor ](https://us.shelly.com/products/shelly-blu-motion), Gobius C tank meter and LiTime/Rebodo Smart Batteries.

- Default values for paths for most sensor classes. 

- Support for multiple simultaneous GATT connections. 


## WHAT IT IS

BT Sensors Plugin for Signalk is a lightweight BLE (Bluetooth Low Energy) framework for listening and connecting to Bluetooth sensors on your boat. After discovery and configuration the plugin sends deltas to Signalk paths with values your sensor reports. <br>

It runs on any 2.0 or greater SignalK installation but on Linux only. It's been tested on Desktop and headless RPis, OpenPlotter, and Cerbo GX/Ekrano.

A typical use case is a Bluetooth thermometer like the Xiaomi LYWSD03MMC, an inexpensive Bluetooth thermometer that runs on a 3V watch battery that can report the current temperature and humidity in your refrigerator or cabin or wherever you want to stick it (no judgement.) <br>

The reported temperature can then be displayed on a Signalk app like Kip, WilhelmSK or, with appropriate mapping to NMEA-2000, a NMEA 2000 Multi-function display. 

It's pretty easy to write and deploy your own sensor class for any currently unsupported sensor. More on that in [the development README](./sensor_classes/DEVELOPMENT.md).

## SUPPORTED SENSORS

### NOTE 

- Not all listed devices and variants have been thoroughly tested. If you encounter any issues, please report on github.  
- Some supported devices cannot be automatically identified -- at least not reliably. You'll need to select the sensor class configuration variable manually.
- Not all supported devices are enumerated under their manufacturer. Some device models that are not known to this  developer may share a protocol with another brand/model and in fact be supported. Please raise an issue on github if you discover a supported device that's not listed or implied below. 

### Electrical 
| Manufacturer | Devices |
|--------------|---------|
|[Victron](https://www.victronenergy.com/)|All documented (as of May 2025) devices that support instant readout (AC Charger, Battery Monitor, DC-DC Converter, DC Energy Meter, GX Device, Inverter, Inverter RS, Lynx Smart BMS, Orion XS, Smart Battery Protect, Smart Lithium and VE Bus) See: https://www.victronenergy.com/panel-systems-remote-monitoring/victronconnect|  
|[Renogy](https://www.renogy.com/)| Renogy Smart Batteries, Inverters and Rover Client |
|[JBD/Jibada](https://www.jbdbms.com/)| Smart BMS devices see: https://www.jbdbms.com/collections/smart-bms |
|Xiaoxiang| Rebranded JBD/Jibada |
|[LiTime](https://www.litime.com/)| LifePo4 Smart Batteries |
|Redodo| Rebranded LiTime |
|Kilovault| [Kilovault HLX+ smart batteries ](https://sunwatts.com/content/manual/KiloVault_HLX_PLUS_Datasheet_06252021%20%281%29.pdf?srsltid=AfmBOooY-cGnC_Qm6V1T9Vg5oZzBCJurS0AOGoWqWeyy-dwz2vA-l1Jb) (Note: Kilovault appears to be out of business as of March 2024) |
|[Lancol](www.Lancol.com)| [Micro 10C 12V Car Battery Monitor](https://www.lancol.com/product/12v-bluetooth-4-0-battery-tester-micro-10-c/)|
|[Jikong](https://jikongbms.com/)| https://jikongbms.com/product/ |
|[Junctek](https://www.junteks.com)|[Junctek BMS](https://www.junteks.com/pages/product/index) |
|[Remoran](https://remoran.eu)| [Remoran Wave.3](https://remoran.eu/wave.html)|
|[AC DC Systems](https://marinedcac.com) | [Bank Manager](https://marinedcac.com/pages/bankmanager) hybrid (Pb and Li) charger|
|[Ective](https://ective.de/)| Also Topband(?), Skanbatt and others |

### Environmental 
| Manufacturer |  Devices | 
|--------------|----------|
|[Ruuvi](https://ruuvi.com/)| Ruuvi Tag and Ruuvi Tag Pro|
|[Switch Bot](https://www.switch-bot.com/)| Meter Plus and TH devices |
|[Xiaomi](https://www.mi.com/global/)|  LYWSD03MMC (and variants) Temp and Humidity Sensor |
|[ATC](https://github.com/atc1441/ATC_MiThermometer)| Custom firmware for LYWSD03MMC |
|[Shelly](https://www.shelly.com/)| Shelly SBHT003C Temperature and Humidity Sensor and Shelly SBMO003Z Motion Sensor |
|[Calypso Instruments](https://calypsoinstruments.com)| [Wireless Wind Meters](https://calypsoinstruments.com/sailing)  |
|[Aranet](https://www.aranet.com)| Aranet 2 Temp and Humidity Sensor. Aranet 4 Temp/Humidity/Co2 Sensor. |
|[Govee](http://www.govee.com)| Govee H50xx and H510x Temperature and humidity sensors |
|[BTHome](https://bthome.io/)| NOTE: Framework for IOT sensor devices. |
|[Inkbird](https://inkbird.com/)| TH-2 Temp and Humidity Sensor |
|[SensorPush](https://www.sensorpush.com/)| Temperature, Humidity and Atmospheric Pressure sensor|


### Tanks 
| Manufacturer |  Devices | 
|--------------|----------|
| [Gobius](https://gobiusc.com/) | Gobius-C Tank level sensor|
| [Mopeka](https://www.mopeka.com) | [Mopeka Pro Chek](https://mopeka.com/product-category/recreational-sensors-rv-bbq-etc/) ultrasonic tank level sensor  |

### Propulsion
| Manufacturer |  Devices | 
|--------------|----------|
| [Mercury](https://www.mercurymarine.com)| [Mercury Smartcraft](https://www.mercurymarine.com/us/en/gauges-and-controls/displays/smartcraft-connect) connect engine sensor|

### Beacons

| Manufacturer |  Devices | 
|--------------|----------|
|[FeasyCom](https://www.feasycom.com/)| [BP108B](https://www.feasycom.com/product/fsc-bp108b/) |


## WHO IT'S FOR

Signalk users with a Linux boat-puter (Windows and MacOS are NOT currently supported) and Bluetooth sensors they'd like to integrate into their Signalk datastream.

## REQUIREMENTS

* A Linux Signalk boat-puter with bluetooth-DBUS support
* A Bluetooth adapter, either built-in or a USB external adapter
* [Bluez](https://www.bluez.org) installed
(Go here for [Snap installation instructions](https://snapcraft.io/bluez))
* [Node-ble](https://www.npmjs.com/package/node-ble) (installs with the plugin)

## INSTALLATION

### Signalk Appstore
The plugin is available in the Signalk Appstore. Yay. <br>

### Signal K Server in Docker

If you are running SK Server in a Docker container you'll need to mount the dbus system from the host and run as privileged. <br><br>

Add the following lines `docker-compose.yml`:

```
    volumes:
      - /var/run/dbus:/var/run/dbus
    privileged: true
```

### NPM Installation

Go to you signalk home (usually ~/.signalk) and run:

npm i bt-sensors-plugin-sk@latest

### Linux

If you want to install directly from source (this is mostly of interest to custom sensor class developers) execute the following from a command prompt:<br>

<pre>  cd ~/[some_dir]
  git clone https://github.com/naugehyde/bt-sensors-plugin-sk
  cd bt-sensors-plugin-sk
  git pull
  npm i
  [sudo] npm link
  cd [signalk_home] 
  npm link bt-sensors-plugin-sk</pre>

Finally, restart SK. Plugin should appear in your server plugins list.<br>

> NOTE: "~/.signalk" is the default signalk home on Linux. If you're 
> getting permissions errors executing npm link, try executing "npm link" under sudo.

## KNOWN ISSUES

### Connected Devices on Raspberry Pi platform (4/4b/5/CM400/CM500)

Onboard Raspberry Pi WiFi can cause interference with the onboard Bluetooth resulting in lost connections to GATT connected devices (Renogy, JBD, etc. )

One simple solution is to install a USB BT adapter like the [Tp-link UB500-Plus](https://www.tp-link.com/us/home-networking/usb-adapter/ub500-plus/) 

### USB 3.0 and HDMI interference

Poorly shielded USB 3.0 and HDMI (5ghz) can interfere with BT transmission (2.4ghz).

### Configuration Panel

- Safari 18.1 on OsX produces errors on load that kill the configuration screen. No known cause. Upgrade to most recent Safari or use Chrome.
- Unsaved sensor configuration changes are lost after selecting a different sensor. Be sure to Save changes for now.
- Victron GX, Victron Smart Battery Protect, and Victron VE Bus sensor classes have no default paths currently. Users will need to manually input.

### Runtime

- IMPORTANT Set `Scan for new devices interval` to `0` after configuration is complete. The plugin will run but in Bluetooth-rich environments, or if you have a long range BT 5.3 device, the system Bluetooth stack may fail after 4 hours or so.
- There's no way that I know of to remove a SK Path without restarting the server. So if any active paths are changed by the plugin, you'll still see them hanging around in the data browser growing stale until you restart the server.
- RPi 3/4/5/CM400s when running an Access Point on the on board Wifi can cause a problem connecting to devices through the onboard BT. The only known fix is to disable the onboard Bluetooth and use a USB BT adapter. Alternatively, you can use a USB WiFi adapter. NOTE: This only applies to _connected_ devices like Renogy devices, LiTime batteries etc. 

### Problems saving the configuration after installing plugin for first time (fixed as of Version 1.2.5)  

Device config after being saved will appear to be "missing" after restarting. The config is in fact saved in the plugin config directory. All you have to do is Submit the main configuration then enable and optionally disable Debug. This, believe it or not, ensures that the config is marked as enabled. You should see your data now and upon restart. 


## CONFIGURATION

After installing and restarting Signalk you should see a "BT Sensors Plugin" option in the Signalk->Server->Plugin Config page.<br><br>

On initial configuration, wait for your Bluetooth adapter to scan devices. The plugin will scan for new devices at whatever you set the "scan for new devices interval" value to. (NOTE: You only need to scan for new devices during configuration. Once your config is set, set the new devices interval to 0.) <br><br>

<img width="1182" alt="Screenshot 2025-06-12 at 9 33 57 AM" src="https://github.com/user-attachments/assets/f0e1d644-3090-4f13-820e-748e9c83bc82" />
<br><br>

Select the sensor you want Signalk to listen to from the categorized list.<br>

<img width="1115" alt="Screenshot 2025-06-12 at 9 34 16 AM" src="https://github.com/user-attachments/assets/70baf082-c181-4482-bde4-1e65c07702de" />

NOTE: Devices that are not configured appear in *italics*. Configured devices with unsaved changes are asterisked.

The selected device's configuration will appear below the list of found devices.

<img width="1095" alt="Screenshot 2025-06-12 at 9 34 48 AM" src="https://github.com/user-attachments/assets/48670df2-7f85-4ca1-9ea2-c1cf49087858" />

If you see your device in the UNKNOWN tab it may not be currently supported. But fear not, you can add custom sensor classes yourself. (Check out the [development README](./sensor_classes/DEVELOPMENT.md).) 

If your device appears as UNKNOWN and is a supported sensor it's likely that it can't be automatically identified by the plugin. Select the senor and then select the appropriate Sensor Class from the dropdown list. After saving, you should see your sensor in the tab under its type (Electrical, etc). You'll be able to edit the paths for the sensor now. 
<br><br>



Now it's a simple matter of associating the data emitted by the sensor with the Signalk path you want it to update. (Also, you can name your sensor so when it appears in logs its easy to recognize.) <br><br>

<img width="1087" alt="Screenshot 2025-06-12 at 9 35 01 AM" src="https://github.com/user-attachments/assets/6deee310-57ec-4df6-979a-6ca16699392d" />

Most devices will have default paths that should align with the SignalK spec. If the sensor is missing defaults or the defaults are not consistent with the SK spec, create an issue or open a pull request and add your own to the sensor's `initSchema()` method. 

Be sure to Save your device configuration by selecting **Save**. 

<img width="325" alt="Screenshot 2025-06-12 at 9 35 16 AM" src="https://github.com/user-attachments/assets/951f41ce-2363-4527-9d9b-d5aa9aca7e14" />

To delete the configuration, select **Delete**. To undo any changes, select **Undo**.

Your device will restart its connection automatically after saving.

You may see embedded in a default path values like `{zone}`. This is a parameter variable you can set in the config whose value can cascade through the configuration of your paths.

<img width="309" alt="Screenshot 2025-06-12 at 9 37 15 AM" src="https://github.com/user-attachments/assets/3b02e819-4408-4b37-a257-cda8f4a035c5" /><img width="192" alt="Screenshot 2025-06-12 at 9 37 28 AM" src="https://github.com/user-attachments/assets/1cf13934-4c09-47b3-8eef-d215fcd93374" />  

Any member variable of the sensor class can be used as a parameter variable. Equally, any unary function that returns a string can be used as a parameter variable (`{macAndName}`, for example). Use with caution.

<br><br>

## NOW WHAT?

You should see data appear in your data browser. Here's a screenshot of Signalk on my boat displaying battery data from a Victron SmartShunt. <br><br>

<img width="1142" alt="Screenshot 2024-09-01 at 9 14 27 PM" src="https://github.com/user-attachments/assets/80abbc1c-e01e-4908-aa1a-eec83679cd7c"><br><br>

You can now take the data and display it using Kip, WilhelmSK or route it to NMEA-2K and display it on a N2K MFD, or use it to create and respond to alerts in Node-Red. Isn't life grand?

## NOTES ON WORKING WITH BLUETOOTH DEVICES

This project got started when I wanted to monitor the temperature in my boat's refrigerator. The thought of spending > $100 US and straining my back muscles so I could run NMEA wires under my cabin sole or behind my water heater got me thinking "Wireless, that sounds like a good idea."

A year or so later, I have wireless Bluetooth sensors reporting not only on my refrigerator temperature but on the temperature and humidity in the vberth, on the deck and at the nav table. I'm getting wireless electrical data from my house and starter battery banks as well as on the levels of my propane tank. When there's motion detected on my boat, I get an email and a text telling me so. All wirelessly. All on inexpensive devices powered by inexpensice batteries that last sometimes for years and can be purchased at my local CVS (a US mega-pharmacy).
 
Bluetooth LE (Low Energy) sensors are very inexpensive (especially compared to marine vendor options), widely available, and depending on the brand, very durable (even in marine environments).

Some things I've learned that may be of use.

### The Interference is Real

Bluetooth LE runs at 2.4 GHZ. This is an, uh, oversubscribed part of the EM spectrum. If you're not careful with  the placement and shielding of your 2.4Ghz devices, you will encounter interference and signal/connection dropoff. 

HDMI and USB 3.0, both of which operate at approximately twice the frequency of BT-LE can cause as much signal interference as a 2.4Ghz device. One plugin user noticed that when he turned on the HDMI monitor to his RPI, the plugin would lose a connection to some of his devices. 

### It's Not as Simple as You Think

There are two ways that Bluetooth devices emit their data. One, the old-fashioned way is through a full-fledged connection. Generally, that's a GATT (for Generic ATTribute Profile) connection. The other, which makes sense for IOT devices like most sensors, is by squeezing data into the device's Advertisement protocol.

GATT connections require a lot of power and drain batteries pretty quickly, hence the Advertisement protocol hack that IOT devices use. 

It's also a pain in the butt to maintain a GATT connection. AND you can only have so many per client device (seven, usually). 

Victron, for example, started off its instant readout program with GATT connections (the battery power didn't matter as their devices are all powered by wire) but eventually gave up and went to an encrypted Advertising protocol which allowed them in the Connect App and their Cerbo devices to monitor multiple devices without a connection.

Not all BMS manufacturers are as wise. Many of the inexpensive BMSes developed in China (several of which the plugin supports) use GATT connections. GATT connections are perfectly adequate if all you're doing is connecting through an app, checking your starter battery voltage, for instance, then closing the app. It's another thing when you've got a client like Signal K which is listening for changes to the starter battery voltage at all times.

All of which is to say, be aware that if your device uses a GATT connection, it may suffer from connection loss.

If your device is connection-y and frequently drops its connection and there's not a lot of obvious interference, please fill out an issue on github.

### RPI 3/4/4b/5 Bluetooth Sucks

The Raspberry Pi's native BT radio strength is weak. Unless all your sensors are within direct line of sight and less than 20 or so feet from your RPI you'll get inconsistent results. 

Get yourself a BT 5.3 USB adapter. They're inexpensive (around $20 US). I have a [Tp-link UB500-Plus](https://www.tp-link.com/us/home-networking/usb-adapter/ub500-plus/) on my boat. *chef's kiss*


### Bluetooth on Linux ain't Great

Linux, IMHO, is a server OS first, a desktop OS second. Unfortunately, a lot of Linux developers have dreams of killing OSx and Windows and saving the world with open source (a noble but foolosh conceit). As a result, things like the Bluetooth stack on Linux skew toward desktop-friendly devices like headphones, keyboards, mice and the like. 

The use pattern for a connected bluetooth peripheral is: start the scanner for one-time discovery and pairing which is followed by regular connection and usage (with no scanning necessary).

For most Advertisement-oriented devices, the use pattern is turn scanner on and listen for changes to Advertised values. As most sensors are Advertisement-oriented, the plug-in keeps the Bluetooth scanner on at all times. 

If a process on the server turns off the scanner, the plugin will, at least for Advertisement-oriented devices, appear to have stopped. Connected devices will continue to run normally, however.

Because Desktop installations are oriented toward connected peripherals, the Bluetooth manager on Rasberry Pi's may turn off the scanner when it's closed by a user. So keep that in mind. 

Disable/enable the plugin or submit your changes to restart the scanner if it stops.

#### D-BUS
Linux uses D-Bus, a path-oriented data store for getting and setting system info. 

Bluez, the Debian standard for interacting with BT devices is D-Bus oriented. This plug-in relies on D-Bus for its BT data. 

D-Bus keeps a reference to scanned BT devices for a default of 30s. If a device is not paired, D-Bus tosses that reference out and waits for another Advertisement from the device before adding the device back into its database. 

As a result, some devices with Advertisement periods of less than the default Bluez stay alive parameter (30s) appear to be permanently unavailable.

The simplest solution is pair any device that fails to show up in the scan. See [pairing guide](./pairing.md) for more info on how to pair a device to your Signal K server. 

Future versions of the plugin will allow you to pair from the configuration interface (assuming it's possible and I have the time.)


## THANKS

Many thanks to all those who contributed to the project either with code or testing or just letting me sit on a dock near their boat and connect to their devices.

- Michael aboard the A Bientot
- Kevin on the Luna Miel
- Jason on the Apres Ski
- Teppo
- Ilya
- Guthip
- Peter
- Greg
- Bram
- Karl
- Mat in NZ
- Kees
- Scarns
- John W.
- Sebastian
- Arjen
- SDLee
- Jordan
- Jan of SKipper App fame

It takes a village. Or more appropriately, an armada. Okay, regatta. But you get the idea.
  
  
 
