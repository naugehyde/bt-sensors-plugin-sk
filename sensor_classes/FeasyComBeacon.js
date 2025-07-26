
const BTSensor = require("../BTSensor");

class FeasyComBeacon extends BTSensor {

    static async identify (device){
      return null
    }
    static IsRoaming = true;
    static Domain = BTSensor.SensorDomains.beacons


    initSchema(){
        super.initSchema()
        this.Beacon_initSchema()
    }

    propertiesChanged(props){
      super.propertiesChanged(props);
      this.Beacon_propertiesChanged(props) 
    }

    getManufacturer(){
        return "FeasyCom Inc.";
    }

    getDescription(){
        return `${this.getName()} iBeacon/Eddystone device`
    }
}

module.exports = FeasyComBeacon;
