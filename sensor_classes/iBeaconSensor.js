
const BTSensor = require("../BTSensor");
const iBeacon = require("./Beacon/iBeacon")

class iBeaconSensor extends BTSensor {

    static async identify (device){
      return null
    }
    static IsRoaming = true;
    static Domain = BTSensor.SensorDomains.beacons
    static ImageFile = "iBeacon.jpg"
    

    beacon=new iBeacon(this)

    initSchema(){
        super.initSchema()
        this.beacon.initSchema()
    }

    initListen(){
      super.initListen()
      this.beacon.initListen()
    }
    elapsedTimeSinceLastContact(){
      return this.beacon.elapsedTimeSinceLastContact(super.elapsedTimeSinceLastContact())
    }

    propertiesChanged(props){
      super.propertiesChanged(props);
      this.beacon.propertiesChanged(props) 
    }

    getTextDescription(){
        return `${this.getName()} iBeacon device`
    }
  }

module.exports = iBeaconSensor;
