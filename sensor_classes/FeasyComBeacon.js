
const BTSensor = require("../BTSensor");
const Beacon = require("./Beacon/Beacon")

class FeasyComBeacon extends BTSensor {

    static async identify (device){
      return null
    }
    static IsRoaming = true;
    static Domain = BTSensor.SensorDomains.beacons

    beacon = new Beacon(this)

    initSchema(){
        super.initSchema()
        this.beacon.initSchema()
    }

    initListen(){
      super.initListen()
      this.beacon.initListen()

    }
    propertiesChanged(progps){
      super.propertiesChanged(props);
      this.beacon.propertiesChanged(props) 
    }

    getManufacturer(){
        return "FeasyCom Inc.";
    }
    getImage(){
      return "BP108B_1.webp"
    }
    getTextDescription(){
        return `${this.getName()} iBeacon/Eddystone device`
    }
}

module.exports = FeasyComBeacon;
