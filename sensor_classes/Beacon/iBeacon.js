const AbstractBeaconMixin = require('./AbstractBeaconMixin')
function getTxPower(){
    return (this._app.getSelfPath(this._txPowerPath)?.value??0)
}

class iBeacon extends AbstractBeaconMixin {
    static ManufacturerID= 0x004c
    constructor( obj ){
        super(obj)
        obj.getTxPower=getTxPower.bind(obj)

    }
    initSchema(){
        super.initSchema()
        this.addMetadatum("iBeacon.uuid","","sensor UUID",
            (array)=>{
                let s = ''
                array.slice(2,18).forEach((v)=>{s+= v.toString('16').padStart(2,'0')})
                return s
            })
            .default="sensors.{macAndName}.iBeacon.uuid"

        this.addMetadatum("iBeacon.major","","sensor major ID",
            (array)=>{return array.readUInt16BE(18)}
        )
            .examples=["sensors.{macAndName}.iBeacon.major"]

        this.addMetadatum("iBeacon.minor","","sensor minor ID",
            (array)=>{return array.readUInt16BE(20)}
        )
            .examples=["sensors.{macAndName}.iBeacon.minor"]

        this.addMetadatum("iBeacon.txPower","db","signal strength at one meter (db)",
            (array)=>{return array.readInt8(22)}
        )
            .default="sensors.{macAndName}.iBeacon.txPower"

        if (this._paths && this._paths["iBeacon.txPower"])
            this._txPowerPath=this.preparePath(this._paths["iBeacon.txPower"])
    }

    propertiesChanged(props){
        super.propertiesChanged(props)
        if (Object.hasOwn(props,"ManufacturerData")){
            const md = this.valueIfVariant(props.ManufacturerData)[ iBeacon.ManufacturerID]
            if (md){
                const buff=md.value
                if (buff && buff.length>0 && buff[0]==0x02) {
                    this.emitData("iBeacon.uuid", buff)
                    this.emitData("iBeacon.major", buff)
                    this.emitData("iBeacon.minor", buff)
                    this.emitData("iBeacon.txPower", buff)
                }
            }
        }
    }
}
module.exports=iBeacon