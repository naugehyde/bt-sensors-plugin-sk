/*
ManufacturerData.Value:
  02 15 fd a5 06 93 a4 e2 4f b1 af cf c6 eb 07 64  ........O......d
  78 25 27 51 65 c1 fd  x%'Qe.. 
  
  02 15 == ibeacon identifier

  fd a5 06 93 a4 e2 4f b1 af cf c6 eb 07 64 78 25 == UUID
  27 51 65 c1 = major/minor (BE)
  fd == rss at 1m (signed int8)

	ServiceData.0000fff0-0000-1000-8000-00805f9b34fb:
  27 02 28 92 dc 0d 30 26 c1 8e 64                 '.(...0&..d   
  
  ???
  
	ServiceData.0000feaa-0000-1000-8000-00805f9b34fb:
  20 00 0c 31 80 00 00 07 c5 5c 01 74 02 5b         ..1.....\.t.[  

  Eddystone TLM 
	RSSI: 0xffffffa6 (-90)
(all BE)
    20 00 == Eddystone TLM
    0c 31 == voltage 
    80 00 00 == ???
    07 c5 5c == adv count
    01 74 02 == time since powered up (seconds)
    5b == ??

    ServiceData.0000feaa-0000-1000-8000-00805f9b34fb:
  10 0b 03 67 6f 6f 2e 67 6c 2f 50 48 4e 53 64 6d  ...goo.gl/PHNSdm

Eddystone URL

    10 == ID
    0b == transmit power at 0m
    03 "67 6f 6f 2e 67 6c 2f 50 48 4e 53 64" 6d == URL
*/ 



const BTSensor = require("../BTSensor");

class IBeacon extends BTSensor {
    static isSystem = true;

    static async identify(device) {
        /*const md = await this.getDeviceProp(device,'ManufacturerData');
        if (md && Object.hasOwn(md, 0x004c)) {
            if (md[0x004c].value.slice(0,2).join() == [0x02, 0x15].join()) {
            return this
            }
        }*/



       // IBeacon protocol (see above) is incorporated into multiple BT devices
       // The identify:: method above will misidentify any sensor (Govee for example)
       // that the scanner finds.
       // Sensors can still be classified as IBeacons, they'll appear as Unknown devices in 
       // the config. Users can then select IBeacon from the dropdown to
       // instantiate the sensor as an IBeacon object.
       
    return null
    }

    initSchema(){
        super.initSchema()
        this.addDefaultPath("battery","sensors.batteryStrength")   
        .read=(buffer)=>{return buffer[6]}
    }

    propertiesChanged(props){
        super.propertiesChanged(props);
        const buff = this.getServiceData("0000356e-0000-1000-8000-00805f9b34fb");
        if (buff) 
            this.emitData("battery", buff);
    }

    getManufacturer(){
        return "Apple Inc. or clone";
    }

    getTextDescription(){
        return `${this.getName()} iBeacon from Apple Inc. or a clone`
    }
}

module.exports = IBeacon;
