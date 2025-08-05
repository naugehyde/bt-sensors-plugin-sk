
const BTSensor = require("../BTSensor");
const Beacon = require("./Beacon/Beacon")

class FeasyComBeacon extends BTSensor {

    static async identify (device){
      return null
    }
    static IsRoaming = true;
    static Domain = BTSensor.SensorDomains.beacons
    static ImageFile = "BP108B.webp"
    

    beacon=new Beacon(this)

    initSchema(){
        super.initSchema()
        this.beacon.initSchema()
    }

    initListen(){
      super.initListen()
      this.beacon.initListen()

    }
    propertiesChanged(props){
      super.propertiesChanged(props);
      this.beacon.propertiesChanged(props) 
    }

    getManufacturer(){
        return "FeasyCom Inc.";
    }
    getTextDescription(){
        return `${this.getName()} iBeacon/Eddystone device`
    }
}

module.exports = FeasyComBeacon;
