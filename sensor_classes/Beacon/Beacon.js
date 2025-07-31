const Mixin = require('../../mixinish')
const Eddystone = require('./Eddystone.js')

const iBeacon = require('./iBeacon.js')

class Beacon extends Mixin {

    constructor( obj ){
        super(obj)
        obj.eddystone=new Eddystone( obj )
        obj.iBeacon=new iBeacon( obj )
    }
 
    initSchema(){
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
                    title:'distance beyond which presence should not be presumed',
                    type: 'integer',
                    default: 20
                }
            )
        this.addMetadatum("approxDistance","","approximate sensor distance from server")
            .default="sensors.{macAndName}.distance.approximate"

        this.addMetadatum("presence","","boolean indicating crew member likely presence on board")
            .default="manifest.crew.{crewMember}.presence"
        this.getPath("presence").notify=true

        this.eddystone.initSchema()
        this.iBeacon.initSchema()

    }

    propertiesChanged(props){
        if(Object.hasOwn(props,"RSSI")){        
            this.emitDistance(props.RSSI.value)
        }
        this.eddystone.propertiesChanged(props)
        this.iBeacon.propertiesChanged(props)
        
    }

    emitDistance(rssi) {
        const mac = this.getMacAddress()
        const isEddystone=(!this._iBeaconTxPowerPath && this._eddystoneTxPowerPath)
        this.constructor.DistanceManagerSingleton.addSample(mac, rssi) 
        let txPowerPath =  this?._iBeaconTxPowerPath??this._eddystoneTxPowerPath
        if (txPowerPath) {
            const txPower = this.app.getSelfPath(txPowerPath)
        
            if (txPower?.value)  {
                const _txPower = isEddystone? txPower.value-41: txPower.value
                const accuracy = (Math.min(1,+(_txPower/rssi).toFixed(3)))
                const distances= {
                        avgDistance: +this.constructor.DistanceManagerSingleton.getDistance(mac, _txPower, DistanceManager.METHOD_AVG, true).toFixed(2),
                        weightedAveDistance: +this.constructor.DistanceManagerSingleton.getDistance(mac, _txPower, DistanceManager.METHOD_WEIGHTED_AVG, true).toFixed(2),
                        sampledDistance: +this.constructor.DistanceManagerSingleton.getDistance(mac, _txPower, DistanceManager.METHOD_LAST_FEW_SAMPLES, true).toFixed(2),
                        accuracy: accuracy
                    }
                this.emit("approxDistance", distances)
                this.emit("presence", distances.avgDistance<this?.presenceThreshhold??15)
            }
        }
    }

}
module.exports=Beacon