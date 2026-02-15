const OutOfRangeDevice = require('../../OutOfRangeDevice')
const DistanceManager = require('../../DistanceManager')

function getDistances(distanceManager, mac, txPower, rssi ){
    const accuracy = (Math.min(1,+(txPower/rssi).toFixed(3)))
    return {
        avgDistance: +distanceManager.getDistance(mac, txPower, DistanceManager.METHOD_AVG, true).toFixed(2),
        weightedAvgDistance: +distanceManager.getDistance(mac, txPower, DistanceManager.METHOD_WEIGHTED_AVG, true).toFixed(2),
        sampledDistance: +distanceManager.getDistance(mac, txPower, DistanceManager.METHOD_LAST_FEW_SAMPLES, true).toFixed(2),
        accuracy: accuracy
    }
}

class AbstractBeaconMixin  {
    static logSize = 5
    constructor(obj){
        this.elapsedTimeSinceLastContact=this.elapsedTimeSinceLastContact.bind(obj)
        this.initSchema=this.initSchema.bind(obj)
        this.initListen=this.initListen.bind(obj)
        this.propertiesChanged=this.propertiesChanged.bind(obj)
        this.activate=this.activate.bind(obj)
        this.stopListening=this.stopListening.bind(obj)
        obj.GPSLog={log:[],beam:0,loa:0, currentPosition:null, heading:null}
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
                "presenceThreshold",
                {
                    title:'distance in meters beyond which presence on board should not be presumed',
                    type: 'integer',
                    default: 20
                }
            )
            this.addParameter(
                "lastContactThreshold",
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

        this.addMetadatum("GPSLog","","log of crew member's last known GPS coordinates")
            .default="manifest.crew.{crewMember}.GPSLog"

    }
    elapsedTimeSinceLastContact(lc){
        if (Number.isNaN(lc) || lc > this.lastContactThreshold){
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
                this.emit("onBoard", distances.avgDistance<this?.presenceThreshold??20)
            }
             if (this.GPSLog.currentPosition){
                this.GPSLog.log.unshift(
                {
                    timestamp: new Date().toISOString(),
                    heading: this.GPSLog?.heading,
                    distances: distances
                })
                Object.assign(this.GPSLog.log[0], this.GPSLog.currentPosition)
                
                if (this.GPSLog.log.length>AbstractBeaconMixin.logSize){
                    this.GPSLog.log = this.GPSLog.log.slice(0,AbstractBeaconMixin.logSize)
                }
                this.emit("GPSLog", this.GPSLog)
            }
        }
    }

      async activate(config,paths){

        this.GPSLog.beam=this._app.getSelfPath('design.beam')
        this.GPSLog.loa=this._app.getSelfPath('design.length.overall')
        
        this._positionSub  = this._app.streambundle.getSelfStream('navigation.position')
            .onValue(
                (pos) => { 
                    this.GPSLog.currentPosition=pos
                    
                    this.emit("GPSLog",this.GPSLog)
                }
            );

        this._headingSub  = this._app.streambundle.getSelfStream('navigation.headingTrue')
            .onValue(
                (heading) => { 
                    this.GPSLog.heading=heading
                    
                    this.emit("GPSLog",this.GPSLog)
                }
            );
    }

     async stopListening(){
        if (this._positionSub){
            this._positionSub()
            this._positionSub = null
        }
        if (this._headingSub){
            this._headingSub()
            this._headingSub = null
        }
    }

}
module.exports=AbstractBeaconMixin