const OutOfRangeDevice = require('../../OutOfRangeDevice')
const DistanceManager = require('../../DistanceManager')

function getDistances(distanceManager, mac, txPower, rssi ){
    const accuracy = (Math.min(1,+(txPower/rssi).toFixed(3)))
    return {
        avgDistance: +distanceManager.getDistance(mac, txPower, DistanceManager.METHOD_AVG, true).toFixed(2),
        weightedAveDistance: +distanceManager.getDistance(mac, txPower, DistanceManager.METHOD_WEIGHTED_AVG, true).toFixed(2),
        sampledDistance: +distanceManager.getDistance(mac, txPower, DistanceManager.METHOD_LAST_FEW_SAMPLES, true).toFixed(2),
        accuracy: accuracy
    }
}


class AbstractBeaconMixin  {

    constructor(obj){
        this.elapsedTimeSinceLastContact=this.elapsedTimeSinceLastContact.bind(obj)
        this.initSchema=this.initSchema.bind(obj)
        this.initListen=this.initListen.bind(obj)
        this.propertiesChanged=this.propertiesChanged.bind(obj)
    }

    initListen() {
        if (this.device instanceof OutOfRangeDevice){
            this.emit("onBoard",false)
            //{message:`Crew Member: ${this.crewMember} evidently not on board.`})    
        }
    }

    initSchema() {
        this.addDefaultParam("id")
            .examples=["captain_keyring", "firstMate_keyring"]
            this.addParameter(
                "crewMember",
                {
                    title:'crew member associated with beacon',
                    default: "Captain"
                }
            )
             this.addParameter(
                "presenceThreshhold",
                {
                    title:'distance in meters beyond which presence on board should not be presumed',
                    type: 'integer',
                    default: 20
                }
            )
            this.addParameter(
                "lastContactThreshhold",
                {
                    title:'time in seconds beyond which presence on board should not be presumed',
                    type: 'integer',
                    default: 30
                }
            )
        this.addMetadatum("approxDistance","","approximate sensor distance from server")
            .default="sensors.{macAndName}.distance.approximate"

        this.addMetadatum("onBoard","","boolean indicating crew member likely presence on board")
            .default="manifest.crew.{crewMember}.onBoard"

    }
    elapsedTimeSinceLastContact(lc){
        if (Number.isNaN(lc) || lc > this.lastContactThreshhold){
            this.emit("onBoard",false)
        }
        return lc
    }

    propertiesChanged(props){
        if(Object.hasOwn(props,"RSSI")){       
            const mac = this.getMacAddress()
            const rssi = props.RSSI.value
            this.constructor.DistanceManagerSingleton.addSample(mac, rssi) 
            const distances= getDistances(this.constructor.DistanceManagerSingleton, mac, this.getTxPower(), rssi)
            if (distances){
                this.emit("approxDistance", distances) 
                this.emit("onBoard", distances.avgDistance<this?.presenceThreshhold??20)
            }
        }
    }

}
module.exports=AbstractBeaconMixin