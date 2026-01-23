
const BTSensor = require("../BTSensor");
const Eddystone = require("./Beacon/Eddystone")
const iBeacon = require("./Beacon/iBeacon")

class FeasyComBeacon extends BTSensor {

    static async identify (device){
      return null
    }
    static IsRoaming = true;
    static Domain = BTSensor.SensorDomains.beacons
    static ImageFile = "BP108B.webp"
    
    initSchema(){
        super.initSchema()
        this.addParameter("beaconType",
            {
                title:"type of beacon",
                enum: ["Eddystone", "iBeacon"],
                isRequired: true,
                default:"Eddystone"
            }
        )
        this.beacon.initSchema()
    }

    async init(){
      const bt = this?.beaconType??"Eddystone"
      if (bt=="Eddystone") {
        
        this.beacon=new Eddystone(this)

      }
      else 
        if (bt=="iBeacon")
          this.beacon=new iBeacon(this)
        else
          throw new Error (`(${this.getName()}) Unknown Beacon Type: ${bt}`)

      await super.init()

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

    getManufacturer(){
        return "FeasyCom Inc.";
    }
    getTextDescription(){
        return `${this.getName()} iBeacon/Eddystone device`
    }

    async activate(config,paths){
        await super.activate(config,paths)
        await this.beacon.activate(config,paths)
    }

     async stopListening(){

        await super.stopListening()
        this.beacon.stopListening()
    }
}

module.exports = FeasyComBeacon;
